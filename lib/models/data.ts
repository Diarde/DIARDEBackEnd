import * as mongoose from "mongoose";

const Schema = mongoose.Schema;

const DataSchema = new Schema({
    filename: String,
    humanname: String,
    date: Date,
    visible: Boolean, 
    owner: {type: mongoose.Schema.Types.ObjectId, ref: 'User'}
});

// Compile model from schema
var DataModel = mongoose.model('Data', DataSchema);

export default DataModel;