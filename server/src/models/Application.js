import mongoose from 'mongoose';
const applicationSchema=new mongoose.Schema({
  sessionId:{type:mongoose.Schema.Types.ObjectId,ref:'Session'},
  schemeId:{type:String,required:true},
  status:{type:String,enum:['queued','running','awaiting_confirmation','submitted','failed'],default:'queued'},
  steps:[{ts:{type:Date,default:Date.now},message:String,screenshotPath:String}],
  filledValues:{type:mongoose.Schema.Types.Mixed,default:{}},
  trackingId:String,
  receiptPath:String
},{timestamps:{createdAt:true,updatedAt:true}});
export default mongoose.models.Application||mongoose.model('Application',applicationSchema);
