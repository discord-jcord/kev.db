const BetterSqlite3 = require('better-sqlite3');
const { EventEmitter } = require('events');

/**
 * @extends EventEmitter **Ke**y + **V**alue = Kev.db
 * A simple synchronous sqlite3 wrapper, that brings the ease of use.
 */

module.exports = class KevDB extends EventEmitter {
  constructor(options = {}) {
    super(options);

    this.name = options.name || 'kevdb';
    this.useMemory = Boolean(options.memory) || false;
    this.timeout = typeof options.timeout === 'number' ? options.timeout : 5000;
    this.dependOnCache = options.dependOnCache || false;

    this._cache = new Map();
    this.db = new BetterSqlite3('database.sqlite', { memory: this.useMemory, timeout: this.timeout });
  }

  get(key) {
    this._checkIfTableExists();

    if (this.dependOnCache) {
      if (this._cache.has(key)) {
        return this._cache.get(key);
      } else {
        let data = this.db.prepare(`SELECT * FROM ${this.name} WHERE key=?`).get(key);

        try {
          data.value = JSON.parse(data.value);
        } catch(e) {
          data.value;
        };

        this._cache.set(key, data.value);

        return data.value;
      }
    }

    let data = this.db.prepare(`SELECT * FROM ${this.name} WHERE key=?`).get(key);

    try {
      data.value = JSON.parse(data.value);
    } catch(e) {
      data.value;
    };

    /**
     * Emitted once you receive something from the database
     * @event db.receive
     * @prop {Object} data The key/value paid
     * @prop {String} data.key The key of the data
     * @prop {Any?} data.value The value of the key
     */

    this.emit('receive', data);
    return data.value;
  }

  has(key) {
    this._checkIfTableExists();

    let data = this.db.prepare(`SELECT * FROM ${this.name} WHERE key=?`).get(key);
    return data ? true : false;
  }

  set(key, value) {
    this._checkIfTableExists();

    if (this.dependOnCache) {
      this._cache.set(key, value);
    };

    value = typeof value === 'object' ? JSON.stringify(value) : value;

    this.db.prepare(`INSERT INTO ${this.name} (key, value) VALUES (?, ?)`).run(key, value);

    return { key, value }
  }

  _checkIfTableExists() {
    this.db.prepare(`CREATE TABLE IF NOT EXISTS ${this.name} (key TEXT, value TEXT)`).run();
  }
};