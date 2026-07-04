// @ts-nocheck

import { fail } from '@sveltejs/kit';
import { guardStudio } from '$lib/server/studio-guard.js';
import {
  applySignalCloudsFromForm,
  readSignalCloudRecords,
  runStructuralValidation,
  validationMessage,
  writeSignalCloudRecords
} from '$lib/server/studio-io.js';

function loadSignalCloudForm() {
  return readSignalCloudRecords().map((cloud) => ({
    id: cloud.id,
    question: typeof cloud.question === 'string' ? cloud.question : '',
    hint: typeof cloud.hint === 'string' ? cloud.hint : '',
    options: Array.isArray(cloud.options)
      ? cloud.options.map((option) => ({
          id: option.id,
          label: typeof option.label === 'string' ? option.label : ''
        }))
      : []
  }));
}

export function load() {
  guardStudio();

  return {
    clouds: loadSignalCloudForm()
  };
}

/** @type {import('./$types').Actions} */
export const actions = {
  saveSignalClouds: async ({ request }) => {
    guardStudio();

    try {
      const formData = await request.formData();
      const original = readSignalCloudRecords();
      const clouds = applySignalCloudsFromForm(original, formData);

      writeSignalCloudRecords(clouds);
      const validation = runStructuralValidation();

      return {
        cloudStatus: validation.ok ? 'success' : 'warning',
        cloudMessage: validationMessage(validation),
        clouds: loadSignalCloudForm()
      };
    } catch (error) {
      return fail(400, {
        cloudStatus: 'error',
        cloudMessage: error instanceof Error ? error.message : 'Could not save Signal Clouds.',
        clouds: loadSignalCloudForm()
      });
    }
  }
};
