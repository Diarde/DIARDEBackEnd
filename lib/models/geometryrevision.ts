import * as mongoose from "mongoose";

const Schema = mongoose.Schema;

const GeometryRevisionSchema = new Schema({
    author: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    data: Object,
    date: Date,
    comment: String,
    room: {type: mongoose.Schema.Types.ObjectId, ref: 'Room'},
    model: {type: mongoose.Schema.Types.ObjectId, ref: 'Model3Ds'}
});

// Compile model from schema
var GeometryRevisionModel = mongoose.model('GeometryRevisions', GeometryRevisionSchema);

export default GeometryRevisionModel;