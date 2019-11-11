module.exports = {
    syncNedb (db, compact) {

        db.__proto__.syncInsert = async function (q) {
            return new Promise(resolve => {
                this.insert(q, (err, res) => {
                    if (err) {
                        resolve(false);
                    } else {
                        resolve(res);
                    }
                });
            });
        };

        db.__proto__.syncFind = async function (q) {
            return new Promise(resolve => {
                this.find(q, (err, res) => {
                    if (err) {
                        resolve(false);
                    } else {
                        resolve(res);
                    }
                });
            });
        };

        db.__proto__.syncFindOne = async function (q) {
            return new Promise(resolve => {
                this.findOne(q, (err, res) => {
                    if (err) {
                        resolve(false);
                    } else {
                        resolve(res);
                    }
                });
            });
        };

        db.__proto__.syncUpdate = async function (a, b, c = {}) {
            return new Promise(resolve => {
                this.update(a, b, c, (err, res) => {
                    if (err) {
                        resolve(false);
                    } else {
                        resolve(res);
                    }
                });
            });
        };

        if (compact) {
            db.persistence.setAutocompactionInterval(compact * 1000 * 60);
        }
        return db;
    },
    modelDb (db) {
        return class {
            constructor (data = {}, isSave) {
                Object.assign(this, data);
                if (isSave){
                    this.save();
                }
            }
            static get db () {
                return db;
            }
            static find (a) { // return Array
                return new Promise(resolve => {
                    db.find(a, (err, data) => {
                        resolve(data.map(d => new this(d)));
                    });
                });
            }
            static findOne (a) {
                return new Promise(resolve => {
                    db.findOne(a, (err, doc) => {
                        if (err || !doc) {
                            resolve(null);
                        } else {
                            resolve(new this(doc));
                        }
                    });
                });
            }
            _data () {
                const data = {};
                for (let field in this) {
                    if (!['db', '_id'].includes(field)) {
                        data[field] = this[field];
                    }
                }
                return data;
            }
            async update (obj, isSave) {
                Object.assign(this, obj);
                if (isSave) {
                    await this.save();
                }
            }
            save () {
                return new Promise(resolve => {
                    if (!this._id){
                        db.insert(this._data(), (err, doc)=>{
                            this._id = doc._id;
                            resolve();
                        });
                    } else {
                        db.update({_id: this._id}, {$set: this._data()}, {upsert: true}, err => {
                            if (err){
                                resolve(false);
                            } else {
                                resolve(true);
                            }
                        });
                    }
                });
            }
        };
    }
};
