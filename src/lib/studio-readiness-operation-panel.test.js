import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createLiveOperationPanelModel,
  createPrepOperationPanelModel
} from './studio-readiness-operation-panel.js';

test('build test maps idle and running states without terminal data', () => {
  assert.deepEqual(
    createPrepOperationPanelModel({
      running: false,
      result: null,
      busyLabel: 'Testing build…',
      detailsLabel: 'Build test technical details'
    }),
    {
      state: 'idle'
    }
  );

  assert.deepEqual(
    createPrepOperationPanelModel({
      running: true,
      result: null,
      busyLabel: 'Testing build…',
      detailsLabel: 'Build test technical details'
    }),
    {
      state: 'running',
      busyLabel: 'Testing build…'
    }
  );
});

test('build test maps successful and failed terminal results explicitly', () => {
  assert.deepEqual(
    createPrepOperationPanelModel({
      running: false,
      result: {
        prep: { ok: true, output: 'build ok' },
        message: 'Build passed'
      },
      busyLabel: 'Testing build…',
      detailsLabel: 'Build test technical details'
    }),
    {
      state: 'success',
      message: 'Build passed',
      technicalDetails: 'build ok',
      technicalDetailsLabel: 'Build test technical details',
      technicalDetailsInitiallyExpanded: false
    }
  );

  assert.deepEqual(
    createPrepOperationPanelModel({
      running: false,
      result: {
        prep: { ok: false, output: 'build failed' },
        message: 'Build failed'
      },
      busyLabel: 'Testing build…',
      detailsLabel: 'Build test technical details'
    }),
    {
      state: 'error',
      message: 'Build failed',
      technicalDetails: 'build failed',
      technicalDetailsLabel: 'Build test technical details',
      technicalDetailsInitiallyExpanded: true
    }
  );
});

test('running build state takes precedence over a previous terminal result', () => {
  assert.deepEqual(
    createPrepOperationPanelModel({
      running: true,
      result: {
        prep: { ok: false, output: 'old failure' },
        message: 'Old failure'
      },
      busyLabel: 'Testing build…',
      detailsLabel: 'Build test technical details'
    }),
    {
      state: 'running',
      busyLabel: 'Testing build…'
    }
  );
});

test('live publish maps idle, running and successful terminal states', () => {
  assert.deepEqual(
    createLiveOperationPanelModel({
      running: false,
      result: null,
      busyLabel: 'Updating live site…',
      detailsLabel: 'Publishing technical details'
    }),
    {
      state: 'idle'
    }
  );

  assert.deepEqual(
    createLiveOperationPanelModel({
      running: true,
      result: null,
      busyLabel: 'Updating live site…',
      detailsLabel: 'Publishing technical details'
    }),
    {
      state: 'running',
      busyLabel: 'Updating live site…'
    }
  );

  assert.deepEqual(
    createLiveOperationPanelModel({
      running: false,
      result: {
        live: {
          ok: true,
          outcome: 'complete',
          output: 'deploy ok',
          deployedUrl: 'https://example.test'
        },
        message: 'Site updated'
      },
      busyLabel: 'Updating live site…',
      detailsLabel: 'Publishing technical details'
    }),
    {
      state: 'success',
      message: 'Site updated',
      technicalDetails: 'deploy ok',
      technicalDetailsLabel: 'Publishing technical details',
      technicalDetailsInitiallyExpanded: false
    }
  );
});

test('partial live publication is warning while complete failures are errors', () => {
  assert.deepEqual(
    createLiveOperationPanelModel({
      running: false,
      result: {
        live: {
          ok: false,
          outcome: 'partial',
          output: 'push succeeded, deploy failed'
        },
        message: 'Live update partially completed'
      },
      busyLabel: 'Updating live site…',
      detailsLabel: 'Publishing technical details'
    }),
    {
      state: 'warning',
      message: 'Live update partially completed',
      technicalDetails: 'push succeeded, deploy failed',
      technicalDetailsLabel: 'Publishing technical details',
      technicalDetailsInitiallyExpanded: false
    }
  );

  for (const outcome of [
    'preflight_failed',
    'prep_failed',
    'git_failed',
    'failed'
  ]) {
    assert.deepEqual(
      createLiveOperationPanelModel({
        running: false,
        result: {
          live: {
            ok: false,
            outcome,
            output: `${outcome} output`
          },
          message: `${outcome} message`
        },
        busyLabel: 'Updating live site…',
        detailsLabel: 'Publishing technical details'
      }),
      {
        state: 'error',
        message: `${outcome} message`,
        technicalDetails: `${outcome} output`,
        technicalDetailsLabel: 'Publishing technical details',
        technicalDetailsInitiallyExpanded: false
      }
    );
  }
});

test('running live state takes precedence over a previous terminal result', () => {
  assert.deepEqual(
    createLiveOperationPanelModel({
      running: true,
      result: {
        live: {
          ok: false,
          outcome: 'partial',
          output: 'old partial result'
        },
        message: 'Old warning'
      },
      busyLabel: 'Updating live site…',
      detailsLabel: 'Publishing technical details'
    }),
    {
      state: 'running',
      busyLabel: 'Updating live site…'
    }
  );
});
