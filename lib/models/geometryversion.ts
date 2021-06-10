import * as mongoose from "mongoose";

const Schema = mongoose.Schema;

const GeometryVersionSchema = new Schema({
    room: mongoose.Schema.Types.ObjectId,
    revisions: [{type: mongoose.Schema.Types.ObjectId, ref: 'GeometryRevisions'}],
    name: String,
});

// Compile model from schema
var GeometryVersionModel = mongoose.model('GeometryVersions', GeometryVersionSchema);

export default GeometryVersionModel;