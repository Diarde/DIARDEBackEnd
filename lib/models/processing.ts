import * as mongoose from "mongoose";

const Schema = mongoose.Schema;

const  ProcessingSchema = new Schema({
    status: Number,
    history: [{ action: Number, actor: {type: mongoose.Schema.Types.ObjectId, ref: 'User'}, status: Number}],
    result: { 
            model: {type: mongoose.Schema.Types.ObjectId, ref: 'Model3Ds'},
            skp_file: String,
            dfx_file: String }
});

var ProcessingModel = mongoose.model('Processing', ProcessingSchema);

export default ProcessingModel;