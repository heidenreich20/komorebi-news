import * as migration_20261030_003953_initial from './20261030_003953_initial';
import * as migration_20261030_014915_users_roles from './20261030_014915_users_roles';

export const migrations = [
  {
    up: migration_20261030_003953_initial.up,
    down: migration_20261030_003953_initial.down,
    name: '20261030_003953_initial',
  },
  {
    up: migration_20261030_014915_users_roles.up,
    down: migration_20261030_014915_users_roles.down,
    name: '20261030_014915_users_roles'
  },
];
