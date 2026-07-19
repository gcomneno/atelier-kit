<script>
  import StudioFieldLabel from '$lib/components/StudioFieldLabel.svelte';
  import { createStudioImageMutation } from '$lib/studio-image-mutation.js';
  import { untrack } from 'svelte';

  /** @typedef {'none' | 'add' | 'replace' | 'remove'} MutationState */
  /** @typedef {{ state: MutationState, hasUpload: boolean, remove: boolean }} MutationSnapshot */
  /** @typedef {{ none?: string, add: string, replace: string, remove: string }} MutationMessages */

  /** @type {{ uploadName: string, removeName: string, uploadLabel: string, uploadHint?: string, removeLabel: string, hasExisting?: boolean, accept?: string, disabled?: boolean, required?: boolean, stateMessages: MutationMessages, resetKey?: unknown, onmutation?: (snapshot: MutationSnapshot) => void }} */
  let {
    uploadName,
    removeName,
    uploadLabel,
    uploadHint = '',
    removeLabel,
    hasExisting = false,
    accept = 'image/jpeg,image/png,image/webp',
    disabled = false,
    required = false,
    stateMessages,
    resetKey,
    onmutation = () => {}
  } = $props();

  const mutation = createStudioImageMutation();
  /** @type {HTMLInputElement | undefined} */
  let uploadInput = $state();
  let remove = $state(false);
  /** @type {MutationState} */
  let mutationState = $state('none');

  /** @param {MutationSnapshot} snapshot */
  function publish(snapshot) {
    mutationState = snapshot.state;
    onmutation(snapshot);
  }

  /** @param {Event} event */
  function onFileChange(event) {
    const input = /** @type {HTMLInputElement} */ (event.currentTarget);
    const snapshot = mutation.selectFile(input.files?.[0]);
    remove = snapshot.remove;
    publish(snapshot);
  }

  /** @param {Event} event */
  function onRemoveChange(event) {
    const input = /** @type {HTMLInputElement} */ (event.currentTarget);
    const snapshot = mutation.setRemove(input.checked);
    remove = snapshot.remove;
    if (snapshot.remove && uploadInput) uploadInput.value = '';
    publish(snapshot);
  }

  $effect(() => {
    resetKey;
    const nextHasExisting = Boolean(hasExisting);
    untrack(() => {
      const snapshot = mutation.reset(nextHasExisting);
      remove = false;
      if (uploadInput) uploadInput.value = '';
      publish(snapshot);
    });
  });
</script>

<label>
  <StudioFieldLabel label={uploadLabel} {required} hint={uploadHint} optional={!required} />
  <input
    bind:this={uploadInput}
    type="file"
    name={uploadName}
    {accept}
    {disabled}
    required={required && !hasExisting && !remove}
    onchange={onFileChange}
  />
</label>

{#if hasExisting}
  <label class="checkbox">
    <input type="checkbox" name={removeName} checked={remove} onchange={onRemoveChange} />
    {removeLabel}
  </label>
{/if}

{#if mutationState !== 'none'}
  <p class="hint image-mutation-state" aria-live="polite">{stateMessages[mutationState]}</p>
{/if}
