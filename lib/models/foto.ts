import * as mongoose from "mongoose";

const Schema = mongoose.Schema;

const FotoSchema = new Schema({
    filename: String,
    date: Date,
    visible: Boolean, 
    owner: {type: mongoose.Schema.Types.ObjectId, ref: 'User'}, 
    metddata: { resolution: { x: Number, y: Number }}
});

// Compile model from schema
var FotoModel = mongoose.model('Fotos', FotoSchema);

export default FotoModel;