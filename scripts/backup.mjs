import {DatabaseSync} from 'node:sqlite';
import {resolve} from 'node:path';
const output=process.argv[2];
if(!output)throw new Error('Usage: node scripts/backup.mjs /absolute/path/backup.sqlite');
const db=new DatabaseSync(process.env.DATABASE_PATH||'./data/store.sqlite');
db.exec('VACUUM INTO '+"'"+resolve(output).replaceAll("'","''")+"'");
console.log('Consistent database backup created. Encrypt it and store it away from this server.');
