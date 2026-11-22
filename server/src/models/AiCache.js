import mongoose from 'mongoose';
const cacheSchema = new mongoose.Schema({ _id: String, kind: String, response: mongoose.Schema.Types.Mixed, createdAt: { type: Date, default: Date.now, expires: 604800 } });
export default mongoose.models.AiCache || mongoose.model('AiCache', cacheSchema);
