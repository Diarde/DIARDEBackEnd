import * as mongoose from "mongoose";

const Schema = mongoose.Schema;

const  InvitationSchema = new Schema({
    email: String,
    token: String,
    date: Date,
    creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
});

// Compile model from schema
var InvitationModel = mongoose.model('Invitation', InvitationSchema );

export default InvitationModel;