import * as mongoose from 'mongoose';

const Schema = mongoose.Schema;

const RoomSchema = new Schema({
  name: String,
  description: String,
  date: Date,
  visible: Boolean,
  processing: {
    status: Number,
    history: [
      {
        action: Number,
        actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        result: {
          model: { type: mongoose.Schema.Types.ObjectId, ref: 'Model3Ds' },
          skp: { type: mongoose.Schema.Types.ObjectId, ref: 'Data' },
          dxf: { type: mongoose.Schema.Types.ObjectId, ref: 'Data' },
        }
      },
    ],
    result: {
      model: { type: mongoose.Schema.Types.ObjectId, ref: 'Model3Ds' },
      skp: { type: mongoose.Schema.Types.ObjectId, ref: 'Data' },
      dxf: { type: mongoose.Schema.Types.ObjectId, ref: 'Data' },
    },
  },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fotos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Fotos' }],
  supplements: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Fotos' }],
  versions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'GeometryVersions' }],
  skps: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Data' }],
  dxfs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Data' }]
});

// Compile model from schema
var RoomModel = mongoose.model('Rooms', RoomSchema);

export default RoomModel;
