use std::fs;
use std::net::{SocketAddr, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use serde::Serialize;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, State, Url, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;

const STUDIO_HOST: &str = "127.0.0.1";
const STUDIO_PORT: u16 = 5173;
const STUDIO_PATH: &str = "/studio";
const PREVIEW_PATH: &str = "/";
const SERVER_WAIT_SECS: u64 = 90;

struct AppState {
    site_path: Mutex<Option<PathBuf>>,
    dev_server: Mutex<Option<Child>>,
}

#[derive(Serialize)]
struct DesktopStatus {
    site_path: Option<String>,
    site_valid: bool,
    server_running: bool,
    studio_url: String,
    preview_url: String,
}

fn studio_url() -> String {
    format!("http://{STUDIO_HOST}:{STUDIO_PORT}{STUDIO_PATH}")
}

fn preview_url() -> String {
    format!("http://{STUDIO_HOST}:{STUDIO_PORT}{PREVIEW_PATH}")
}

fn config_path(site_path: &Path) -> PathBuf {
    site_path.join("config/site.yaml")
}

fn is_valid_site_folder(site_path: &Path) -> bool {
    config_path(site_path).is_file()
}

fn prefs_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|error| error.to_string())
}

fn prefs_file(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(prefs_dir(app)?.join("last-site-path.txt"))
}

fn load_saved_site_path(app: &AppHandle) -> Option<PathBuf> {
    let path = prefs_file(app).ok()?;
    let raw = fs::read_to_string(path).ok()?;
    let trimmed = raw.trim();

    if trimmed.is_empty() {
        return None;
    }

    let site_path = PathBuf::from(trimmed);

    if is_valid_site_folder(&site_path) {
        Some(site_path)
    } else {
        None
    }
}

fn save_site_path(app: &AppHandle, site_path: &Path) -> Result<(), String> {
    let prefs = prefs_dir(app)?;
    fs::create_dir_all(&prefs).map_err(|error| error.to_string())?;
    fs::write(prefs_file(app)?, site_path.to_string_lossy().as_bytes())
        .map_err(|error| error.to_string())
}

fn npm_command() -> &'static str {
    if cfg!(target_os = "windows") {
        "npm.cmd"
    } else {
        "npm"
    }
}

fn server_addr() -> SocketAddr {
    format!("{STUDIO_HOST}:{STUDIO_PORT}")
        .parse()
        .expect("valid studio address")
}

fn server_ready() -> bool {
    TcpStream::connect_timeout(&server_addr(), Duration::from_millis(400)).is_ok()
}

fn wait_for_server() -> Result<(), String> {
    let deadline = Instant::now() + Duration::from_secs(SERVER_WAIT_SECS);

    while Instant::now() < deadline {
        if server_ready() {
            return Ok(());
        }

        std::thread::sleep(Duration::from_millis(250));
    }

    Err(format!(
        "Timed out waiting for dev server at {STUDIO_HOST}:{STUDIO_PORT}."
    ))
}

fn stop_dev_server_state(state: &AppState) {
    let mut guard = state.dev_server.lock().expect("dev server lock");

    if let Some(mut child) = guard.take() {
        let _ = child.kill();
        let _ = child.wait();
    }
}

fn stop_dev_server(state: &State<'_, AppState>) {
    stop_dev_server_state(state.inner());
}

fn start_dev_server_state(state: &AppState, site_path: &Path) -> Result<(), String> {
    stop_dev_server_state(state);

    if !is_valid_site_folder(site_path) {
        return Err("config/site.yaml not found in the selected folder.".into());
    }

    let child = Command::new(npm_command())
        .args([
            "run",
            "dev",
            "--",
            "--host",
            STUDIO_HOST,
            "--port",
            &STUDIO_PORT.to_string(),
        ])
        .current_dir(site_path)
        .env("ATELIER_STUDIO", "1")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| {
            format!(
                "Could not start npm run dev. Is Node.js installed? ({error})"
            )
        })?;

    *state.dev_server.lock().expect("dev server lock") = Some(child);
    wait_for_server()
}

fn start_dev_server(state: &State<'_, AppState>, site_path: &Path) -> Result<(), String> {
    start_dev_server_state(state.inner(), site_path)
}

fn build_status(state: &State<'_, AppState>) -> DesktopStatus {
    let site_path = state.site_path.lock().expect("site path lock").clone();
    let site_valid = site_path
        .as_ref()
        .map(|path| is_valid_site_folder(path))
        .unwrap_or(false);
    let server_running = server_ready();

    DesktopStatus {
        site_path: site_path.map(|path| path.to_string_lossy().to_string()),
        site_valid,
        server_running,
        studio_url: studio_url(),
        preview_url: preview_url(),
    }
}

fn open_studio_window(app: &AppHandle) -> Result<(), String> {
    let url = Url::parse(&studio_url()).map_err(|error| error.to_string())?;

    if let Some(window) = app.get_webview_window("studio") {
        window.navigate(url).map_err(|error| error.to_string())?;
        window.set_focus().map_err(|error| error.to_string())?;
        return Ok(());
    }

    WebviewWindowBuilder::new(app, "studio", WebviewUrl::External(url))
        .title("Atelier Studio")
        .inner_size(1280.0, 860.0)
        .center()
        .build()
        .map_err(|error| error.to_string())?;

    Ok(())
}

#[tauri::command]
fn get_status(state: State<'_, AppState>) -> DesktopStatus {
    build_status(&state)
}

#[tauri::command]
async fn pick_site_folder(app: AppHandle, state: State<'_, AppState>) -> Result<DesktopStatus, String> {
    let selection = app
        .dialog()
        .file()
        .set_title("Choose Atelier-Kit site folder")
        .blocking_pick_folder();

    let Some(folder) = selection else {
        return Ok(build_status(&state));
    };

    let site_path = PathBuf::from(folder.to_string());

    if !is_valid_site_folder(&site_path) {
        return Err(
            "This folder is not an Atelier-Kit site (missing config/site.yaml).".into(),
        );
    }

    save_site_path(&app, &site_path)?;
    *state.site_path.lock().expect("site path lock") = Some(site_path);

    Ok(build_status(&state))
}

#[tauri::command]
async fn start_studio(app: AppHandle, state: State<'_, AppState>) -> Result<DesktopStatus, String> {
    let site_path = state
        .site_path
        .lock()
        .expect("site path lock")
        .clone()
        .ok_or_else(|| "Choose a site folder first.".to_string())?;

    if !server_ready() {
        start_dev_server(&state, &site_path)?;
    }

    open_studio_window(&app)?;
    let status = build_status(&state);
    let _ = app.emit("studio-ready", &status);

    Ok(status)
}

#[tauri::command]
fn stop_studio(state: State<'_, AppState>) -> DesktopStatus {
    stop_dev_server(&state);
    build_status(&state)
}

#[tauri::command]
async fn open_preview(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    if !server_ready() {
        let site_path = state
            .site_path
            .lock()
            .expect("site path lock")
            .clone()
            .ok_or_else(|| "Choose a site folder and start the studio first.".to_string())?;
        start_dev_server(&state, &site_path)?;
    }

    app.opener()
        .open_url(preview_url(), None::<&str>)
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn open_site_folder(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let site_path = state
        .site_path
        .lock()
        .expect("site path lock")
        .clone()
        .ok_or_else(|| "No site folder selected.".to_string())?;

    app.opener()
        .open_path(site_path.to_string_lossy(), None::<&str>)
        .map_err(|error| error.to_string())
}

fn build_tray_menu(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let open_folder = MenuItem::with_id(app, "open-folder", "Open site folder", true, None::<&str>)?;
    let open_preview = MenuItem::with_id(app, "open-preview", "Open preview", true, None::<&str>)?;
    let stop_server = MenuItem::with_id(app, "stop-server", "Stop dev server", true, None::<&str>)?;
    let quit = PredefinedMenuItem::quit(app, Some("Quit"))?;

    Menu::with_items(
        app,
        &[&open_folder, &open_preview, &stop_server, &quit],
    )
}

fn handle_tray_event(app: &AppHandle, event: TrayIconEvent) {
    if let TrayIconEvent::Click {
        button: MouseButton::Left,
        button_state: MouseButtonState::Up,
        ..
    } = event
    {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

fn handle_tray_menu(app: &AppHandle, id: &str) {
    let state = app.state::<AppState>();

    match id {
        "open-folder" => {
            if let Some(site_path) = state.site_path.lock().expect("site path lock").clone() {
                let _ = app
                    .opener()
                    .open_path(site_path.to_string_lossy(), None::<&str>);
            }
        }
        "open-preview" => {
            if server_ready() {
                let _ = app
                    .opener()
                    .open_url(preview_url(), None::<&str>);
            } else if let Some(site_path) = state.site_path.lock().expect("site path lock").clone() {
                if start_dev_server_state(state, &site_path).is_ok() {
                    let _ = app
                        .opener()
                        .open_url(preview_url(), None::<&str>);
                }
            }
        }
        "stop-server" => {
            stop_dev_server_state(state);
        }
        _ => {}
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            site_path: Mutex::new(None),
            dev_server: Mutex::new(None),
        })
        .setup(|app| {
            if let Some(saved) = load_saved_site_path(app.handle()) {
                *app
                    .state::<AppState>()
                    .site_path
                    .lock()
                    .expect("site path lock") = Some(saved);
            }

            let menu = build_tray_menu(app.handle())?;
            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("Atelier Desktop")
                .on_menu_event(|app, event| handle_tray_menu(app, event.id().as_ref()))
                .on_tray_icon_event(|tray, event| handle_tray_event(tray.app_handle(), event))
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_status,
            pick_site_folder,
            start_studio,
            stop_studio,
            open_preview,
            open_site_folder
        ])
        .build(tauri::generate_context!())
        .expect("error while running Atelier Desktop")
        .run(|app, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                stop_dev_server_state(app.state::<AppState>());
            }
        });
}
