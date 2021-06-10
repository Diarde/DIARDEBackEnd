import * as mongoose from "mongoose";

const Schema = mongoose.Schema;

const Model3DSchema = new Schema({
    date: Date,
    data: Object
});

// Compile model from schema
var Model3DModel = mongoose.model('Model3Ds', Model3DSchema);

export default Model3DModel;
