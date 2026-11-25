// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_safe_ben_grimm.sql';
import m0001 from './0001_strange_purple_man.sql';
import m0002 from './0002_outstanding_cassandra_nova.sql';

export default {
  journal,
  migrations: {
    m0000,
    m0001,
    m0002,
  },
};
