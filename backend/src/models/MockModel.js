const crypto = require('crypto');

class MockQuery {
  constructor(data, isSingle = false) {
    this.data = data;
    this.isSingle = isSingle;
  }

  sort(sortObj) {
    if (this.isSingle || !this.data || !this.data.length) return this;
    const key = Object.keys(sortObj)[0];
    const order = sortObj[key];
    this.data.sort((a, b) => {
      const valA = a[key] || 0;
      const valB = b[key] || 0;
      if (valA < valB) return order === -1 ? 1 : -1;
      if (valA > valB) return order === -1 ? -1 : 1;
      return 0;
    });
    return this;
  }

  skip(num) {
    if (this.isSingle || !this.data || !this.data.length) return this;
    if (num > 0) {
      this.data = this.data.slice(num);
    }
    return this;
  }

  limit(num) {
    if (this.isSingle || !this.data || !this.data.length) return this;
    if (num > 0) {
      this.data = this.data.slice(0, num);
    }
    return this;
  }

  then(resolve, reject) {
    const val = this.isSingle ? this.data : [...(this.data || [])];
    return Promise.resolve(val).then(resolve, reject);
  }

  catch(reject) {
    const val = this.isSingle ? this.data : [...(this.data || [])];
    return Promise.resolve(val).catch(reject);
  }
}

class MockModel {
  constructor(store, data) {
    Object.defineProperty(this, '_store', {
      value: store,
      enumerable: false, // Prevents circular JSON serialization
      writable: true,
      configurable: true
    });
    Object.assign(this, data);
    if (!this._id) {
      this._id = crypto.randomUUID();
    }
    if (!this.createdAt) {
      this.createdAt = new Date();
      this.updatedAt = new Date();
    }
  }

  toJSON() {
    const clone = { ...this };
    delete clone._store;
    return clone;
  }

  async save() {
    this.updatedAt = new Date();
    const existingIdx = this._store.findIndex(doc => doc._id === this._id);
    if (existingIdx >= 0) {
      this._store[existingIdx] = this;
    } else {
      this._store.push(this);
    }
    return this;
  }

  static createStore() {
    const store = [];

    const Model = function (data) {
      return new MockModel(store, data);
    };

    Model.find = function (query = {}) {
      let results = store.filter(doc => {
        for (const key in query) {
          if (doc[key] !== query[key]) return false;
        }
        return true;
      });
      return new MockQuery(results);
    };

    Model.findOne = function (query = {}) {
      let result = store.find(doc => {
        for (const key in query) {
          if (doc[key] !== query[key]) return false;
        }
        return true;
      });
      return new MockQuery(result || null, true);
    };

    Model.create = async function (data) {
      const doc = new Model(data);
      return doc.save();
    };

    Model.findById = function (id) {
      return this.findOne({ _id: id });
    };

    return Model;
  }
}

module.exports = MockModel;
