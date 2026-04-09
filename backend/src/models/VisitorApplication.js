// backend/src/models/VisitorApplication.js - 访客申请 Mongoose 模型

const mongoose = require('mongoose');

const visitorApplicationSchema = new mongoose.Schema({
  // 基础信息
  openid: { type: String, required: true, index: true },
  
  // 访客信息
  name: { type: String, required: true },
  phone: { type: String, required: true },
  idType: { 
    type: String, 
    required: true, 
    default: '居民身份证',
    enum: ['居民身份证', '护照', '港澳通行证', '台湾通行证', '其他']
  },
  idCard: { type: String, required: true },
  organization: String,
  plateNumber: String,
  
  // 随行人员
  companions: [{
    name: String,
    idCard: String,
    phone: String
  }],
  
  // 被访人信息
  hostName: { type: String, required: true },
  hostPhone: { type: String, required: true },
  visitDate: { type: String, required: true },
  visitTime: { type: String, required: true },
  endDate: { type: String, required: true },
  endTime: { type: String, required: true },
  purpose: { type: String, required: true },
  remark: String,
  
  // 审批相关
  status: { 
    type: String, 
    required: true, 
    default: 'pending',
    enum: ['pending', 'approved', 'rejected']
  },
  submitTime: { type: Date, required: true, default: Date.now },
  approvalTime: Date,
  rejectReason: String,
  oaFlowId: String,
  
  // 审计字段
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// 更新时自动更新 updatedAt 字段
visitorApplicationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 创建索引
visitorApplicationSchema.index({ submitTime: -1 });
visitorApplicationSchema.index({ status: 1 });
visitorApplicationSchema.index({ phone: 1 });

module.exports = mongoose.model('VisitorApplication', visitorApplicationSchema);
