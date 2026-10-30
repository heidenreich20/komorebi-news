import * as migration_20261030_003953_initial from './20261030_003953_initial';
import * as migration_20261030_014915_users_roles from './20261030_014915_users_roles';
import * as migration_20261030_031525_categories from './20261030_031525_categories';
import * as migration_20261030_035148_tags from './20261030_035148_tags';
import * as migration_20261030_035731_media_metadata from './20261030_035731_media_metadata';
import * as migration_20261030_041127_authors from './20261030_041127_authors';

export const migrations = [
  {
    up: migration_20261030_003953_initial.up,
    down: migration_20261030_003953_initial.down,
    name: '20261030_003953_initial',
  },
  {
    up: migration_20261030_014915_users_roles.up,
    down: migration_20261030_014915_users_roles.down,
    name: '20261030_014915_users_roles',
  },
  {
    up: migration_20261030_031525_categories.up,
    down: migration_20261030_031525_categories.down,
    name: '20261030_031525_categories',
  },
  {
    up: migration_20261030_035148_tags.up,
    down: migration_20261030_035148_tags.down,
    name: '20261030_035148_tags',
  },
  {
    up: migration_20261030_035731_media_metadata.up,
    down: migration_20261030_035731_media_metadata.down,
    name: '20261030_035731_media_metadata',
  },
  {
    up: migration_20261030_041127_authors.up,
    down: migration_20261030_041127_authors.down,
    name: '20261030_041127_authors'
  },
];
