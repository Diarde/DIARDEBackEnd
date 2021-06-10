import * as mongoose from "mongoose";

const Schema = mongoose.Schema;

const  ProjectSchema = new Schema({
    name: String,
    description: String,
    date: Date,
    visible: Boolean, 
    creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    rooms: [{type: mongoose.Schema.Types.ObjectId, ref: 'Rooms'}]
});

// Compile model from schema
var ProjectModel = mongoose.model('Projects', ProjectSchema);

export default ProjectModel;