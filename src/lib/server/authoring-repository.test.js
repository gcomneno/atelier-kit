import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  AuthoringChangeSetError,
  AuthoringRepositoryPathError,
  AuthoringRevisionConflictError,
  LocalFilesystemAuthoringRepository,
  authoringChangeSetRevision,
  normalizeAuthoringPath
} from './authoring-repository.js';

/**
 * @typedef {{
 *   root: string,
 *   repository: LocalFilesystemAuthoringRepository
 * }} RepositoryFixture
 */

/**
 * @param {(fixture: RepositoryFixture) => void} callback
 */
function withRepository(callback) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'atelier-authoring-repository-'));

  try {
    mkdirSync(path.join(root, 'content'), { recursive: true });
    mkdirSync(path.join(root, 'static', 'images'), { recursive: true });

    return callback({
      root,
      repository: new LocalFilesystemAuthoringRepository(root)
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('normalizes explicit project-relative paths', () => {
  assert.equal(normalizeAuthoringPath('content/items/book.yaml'), 'content/items/book.yaml');
  assert.equal(normalizeAuthoringPath('./content/item.yaml'), 'content/item.yaml');
});

test('rejects absolute, traversal, empty-segment and NUL paths', () => {
  for (const candidate of [
    '/etc/passwd',
    '../outside',
    'content/../outside',
    'content//item.yaml',
    'C:\\Windows\\system.ini',
    '\\\\server\\share\\file',
    'content/\0item.yaml',
    ''
  ]) {
    assert.throws(
      () => normalizeAuthoringPath(candidate),
      AuthoringRepositoryPathError,
      candidate
    );
  }
});

test('rejects filesystem paths that traverse a symbolic link', () => {
  withRepository(({ root, repository }) => {
    const outside = mkdtempSync(path.join(os.tmpdir(), 'atelier-authoring-outside-'));

    try {
      writeFileSync(path.join(outside, 'secret.txt'), 'outside');
      symlinkSync(outside, path.join(root, 'content', 'linked'));

      assert.throws(
        () => repository.readText('content/linked/secret.txt'),
        AuthoringRepositoryPathError
      );
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
});

test('reads text with a deterministic revision token', () => {
  withRepository(({ root, repository }) => {
    writeFileSync(path.join(root, 'content', 'item.yaml'), 'title: First\n');

    const first = repository.readText('content/item.yaml');
    const second = repository.readText('content/item.yaml');

    assert.equal(first.content, 'title: First\n');
    assert.match(first.revision, /^sha256:[0-9a-f]{64}$/);
    assert.equal(first.revision, second.revision);
  });
});

test('reads binary content without text conversion', () => {
  withRepository(({ root, repository }) => {
    const bytes = Buffer.from([0, 1, 2, 127, 128, 255]);

    writeFileSync(path.join(root, 'static', 'images', 'sample.bin'), bytes);

    const result = repository.readBinary('static/images/sample.bin');

    assert.deepEqual(result.content, bytes);
    assert.match(result.revision, /^sha256:[0-9a-f]{64}$/);
  });
});

test('revision changes when file content changes', () => {
  withRepository(({ root, repository }) => {
    const filename = path.join(root, 'content', 'item.yaml');

    writeFileSync(filename, 'title: First\n');
    const before = repository.revision('content/item.yaml');

    writeFileSync(filename, 'title: Second\n');
    const after = repository.revision('content/item.yaml');

    assert.notEqual(before, after);
  });
});

test('writes text and returns the resulting revision', () => {
  withRepository(({ root, repository }) => {
    const result = repository.writeText('content/item.yaml', 'title: Written\n');

    assert.equal(
      readFileSync(path.join(root, 'content', 'item.yaml'), 'utf8'),
      'title: Written\n'
    );
    assert.equal(result.revision, repository.revision('content/item.yaml'));
  });
});

test('expected null revision permits creation only while the file is absent', () => {
  withRepository(({ repository }) => {
    repository.writeText(
      'content/item.yaml',
      'title: First\n',
      { expectedRevision: null }
    );

    assert.throws(
      () => repository.writeText(
        'content/item.yaml',
        'title: Replacement\n',
        { expectedRevision: null }
      ),
      AuthoringRevisionConflictError
    );
  });
});

test('stale expected revisions reject writes without changing the file', () => {
  withRepository(({ root, repository }) => {
    const filename = path.join(root, 'content', 'item.yaml');

    writeFileSync(filename, 'title: First\n');
    const expectedRevision = repository.revision('content/item.yaml');

    writeFileSync(filename, 'title: Concurrent\n');

    assert.throws(
      () => repository.writeText(
        'content/item.yaml',
        'title: Stale writer\n',
        { expectedRevision }
      ),
      AuthoringRevisionConflictError
    );

    assert.equal(readFileSync(filename, 'utf8'), 'title: Concurrent\n');
  });
});

test('current expected revision permits a controlled write', () => {
  withRepository(({ repository }) => {
    repository.writeText('content/item.yaml', 'title: First\n');
    const expectedRevision = repository.revision('content/item.yaml');

    const result = repository.writeText(
      'content/item.yaml',
      'title: Second\n',
      { expectedRevision }
    );

    assert.equal(result.revision, repository.revision('content/item.yaml'));
  });
});

test('delete removes a file when its expected revision is current', () => {
  withRepository(({ repository }) => {
    repository.writeText('content/item.yaml', 'title: First\n');
    const expectedRevision = repository.revision('content/item.yaml');

    const result = repository.delete(
      'content/item.yaml',
      { expectedRevision }
    );

    assert.deepEqual(result, { revision: null });
    assert.equal(repository.revision('content/item.yaml'), null);
  });
});

test('stale expected revision rejects deletion and preserves the file', () => {
  withRepository(({ root, repository }) => {
    const filename = path.join(root, 'content', 'item.yaml');

    writeFileSync(filename, 'title: First\n');
    const expectedRevision = repository.revision('content/item.yaml');

    writeFileSync(filename, 'title: Concurrent\n');

    assert.throws(
      () => repository.delete(
        'content/item.yaml',
        { expectedRevision }
      ),
      AuthoringRevisionConflictError
    );

    assert.equal(readFileSync(filename, 'utf8'), 'title: Concurrent\n');
  });
});


test('change-set revision is deterministic, path-scoped and models absence', () => {
  withRepository(({ root, repository }) => {
    writeFileSync(
      path.join(root, 'content', 'a.yaml'),
      'title: A\n'
    );
    writeFileSync(
      path.join(root, 'content', 'b.yaml'),
      'title: B\n'
    );

    const forward = repository.revisionForPaths([
      'content/a.yaml',
      'content/b.yaml'
    ]);
    const reverse = repository.revisionForPaths([
      'content/b.yaml',
      'content/a.yaml'
    ]);

    assert.equal(forward, reverse);
    assert.match(
      forward,
      /^changeset-sha256:[0-9a-f]{64}$/
    );

    writeFileSync(
      path.join(root, 'content', 'unrelated.yaml'),
      'title: unrelated\n'
    );

    assert.equal(
      repository.revisionForPaths([
        'content/a.yaml',
        'content/b.yaml'
      ]),
      forward
    );

    const withAbsent =
      repository.revisionForPaths([
        'content/a.yaml',
        'content/missing.yaml'
      ]);

    assert.notEqual(withAbsent, forward);
  });
});

test('applies text, binary and delete as one logical Local change set', () => {
  withRepository(({ root, repository }) => {
    writeFileSync(
      path.join(root, 'content', 'old.yaml'),
      'title: Old\n'
    );

    const paths = [
      'content/item.yaml',
      'static/images/sample.bin',
      'content/old.yaml'
    ];

    const expectedRevision =
      repository.revisionForPaths(paths);

    const result =
      repository.applyChanges(
        [
          {
            type: 'text',
            path: 'content/item.yaml',
            content: 'title: Written\n'
          },
          {
            type: 'binary',
            path: 'static/images/sample.bin',
            content: Buffer.from([0, 1, 255])
          },
          {
            type: 'delete',
            path: 'content/old.yaml'
          }
        ],
        { expectedRevision }
      );

    assert.equal(
      readFileSync(
        path.join(root, 'content', 'item.yaml'),
        'utf8'
      ),
      'title: Written\n'
    );

    assert.deepEqual(
      readFileSync(
        path.join(
          root,
          'static',
          'images',
          'sample.bin'
        )
      ),
      Buffer.from([0, 1, 255])
    );

    assert.equal(
      repository.revision(
        'content/old.yaml'
      ),
      null
    );

    assert.equal(
      result.revision,
      repository.revisionForPaths(paths)
    );
  });
});

test('stale Local change-set revision rejects every requested change', () => {
  withRepository(({ root, repository }) => {
    const first =
      path.join(root, 'content', 'a.yaml');
    const second =
      path.join(root, 'content', 'b.yaml');

    writeFileSync(first, 'title: A\n');
    writeFileSync(second, 'title: B\n');

    const paths = [
      'content/a.yaml',
      'content/b.yaml'
    ];

    const expectedRevision =
      repository.revisionForPaths(paths);

    writeFileSync(
      first,
      'title: Concurrent\n'
    );

    assert.throws(
      () =>
        repository.applyChanges(
          [
            {
              type: 'text',
              path: 'content/a.yaml',
              content: 'title: New A\n'
            },
            {
              type: 'text',
              path: 'content/b.yaml',
              content: 'title: New B\n'
            }
          ],
          { expectedRevision }
        ),
      AuthoringRevisionConflictError
    );

    assert.equal(
      readFileSync(first, 'utf8'),
      'title: Concurrent\n'
    );
    assert.equal(
      readFileSync(second, 'utf8'),
      'title: B\n'
    );
  });
});

test('duplicate or invalid Local changes are rejected before filesystem mutation', () => {
  withRepository(({ root, repository }) => {
    const filename =
      path.join(root, 'content', 'item.yaml');

    writeFileSync(
      filename,
      'title: Original\n'
    );

    const expectedRevision =
      repository.revisionForPaths([
        'content/item.yaml'
      ]);

    assert.throws(
      () =>
        repository.applyChanges(
          [
            {
              type: 'text',
              path: 'content/item.yaml',
              content: 'title: First\n'
            },
            {
              type: 'delete',
              path: './content/item.yaml'
            }
          ],
          { expectedRevision }
        ),
      AuthoringChangeSetError
    );

    assert.equal(
      readFileSync(filename, 'utf8'),
      'title: Original\n'
    );

    assert.throws(
      () =>
        repository.applyChanges(
          [
            {
              type: 'binary',
              path: 'content/item.yaml',
              content: 'not-a-buffer'
            }
          ],
          { expectedRevision }
        ),
      AuthoringChangeSetError
    );

    assert.equal(
      readFileSync(filename, 'utf8'),
      'title: Original\n'
    );
  });
});

test('single-file binary wrapper preserves legacy revision semantics', () => {
  withRepository(({ root, repository }) => {
    const bytes =
      Buffer.from([1, 2, 3, 255]);

    const result =
      repository.writeBinary(
        'static/images/sample.bin',
        bytes
      );

    assert.deepEqual(
      readFileSync(
        path.join(
          root,
          'static',
          'images',
          'sample.bin'
        )
      ),
      bytes
    );

    assert.equal(
      result.revision,
      repository.revision(
        'static/images/sample.bin'
      )
    );
  });
});


test('single-file expected revision is converted directly into its change-set precondition', () => {
  withRepository(({ root, repository }) => {
    const filename =
      path.join(
        root,
        'content',
        'item.yaml'
      );

    writeFileSync(
      filename,
      'title: Initial\n'
    );

    const expectedRevision =
      repository.revision(
        'content/item.yaml'
      );

    const originalRevisionForPaths =
      repository.revisionForPaths.bind(
        repository
      );

    let calls = 0;

    repository.revisionForPaths =
      (paths) => {
        calls += 1;

        if (calls === 1) {
          writeFileSync(
            filename,
            'title: Concurrent\n'
          );
        }

        return originalRevisionForPaths(
          paths
        );
      };

    assert.throws(
      () =>
        repository.writeText(
          'content/item.yaml',
          'title: Stale writer\n',
          { expectedRevision }
        ),
      AuthoringRevisionConflictError
    );

    assert.equal(
      readFileSync(
        filename,
        'utf8'
      ),
      'title: Concurrent\n'
    );
  });
});

test('explicit single-path change-set revision matches revisionForPaths', () => {
  withRepository(({ repository }) => {
    repository.writeText(
      'content/item.yaml',
      'title: Item\n'
    );

    const fileRevision =
      repository.revision(
        'content/item.yaml'
      );

    assert.equal(
      authoringChangeSetRevision([
        {
          path:
            'content/item.yaml',
          revision:
            fileRevision
        }
      ]),
      repository.revisionForPaths([
        'content/item.yaml'
      ])
    );
  });
});
