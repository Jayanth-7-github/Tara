const { Schema, model } = require("mongoose");

const PaymentQrSchema = new Schema(
  {
    event: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    cloudinaryPublicId: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

PaymentQrSchema.index({ event: 1, updatedAt: -1 });
PaymentQrSchema.index({ event: 1, isActive: 1 });
PaymentQrSchema.index(
  { event: 1 },
  {
    unique: true,
    partialFilterExpression: { isActive: true },
  },
);

module.exports = model("PaymentQr", PaymentQrSchema);
