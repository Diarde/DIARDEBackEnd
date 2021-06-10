import * as mongoose from "mongoose";

const Schema = mongoose.Schema;

const GeometrySchema = new Schema({
    geometry: Object,
    project: mongoose.Schema.Types.ObjectId,
    model: mongoose.Schema.Types.ObjectId,
    name: String,
    date: Date
});

// Compile model from schema
var GeometryModel = mongoose.model('Geometries', GeometrySchema);

export default GeometryModel;