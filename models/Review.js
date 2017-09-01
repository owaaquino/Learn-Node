const mongoose = require('mongoose');//mongooes package interface
mongoose.Promise = global.Promise;

const reviewSchema = new mongoose.Schema({
	created: {
		type: Date,
		default: Date.now
	},
	author: {
		type: mongoose.Schema.ObjectId,
		ref: 'User',
		required: 'You must supply an Author'
	},
	store: {
		type: mongoose.Schema.ObjectId, // get the object in different model
		ref: 'Store', // ref model name 
		required: 'You must supply an Store'
	},
	text: {
		type: String,
		required: 'Comment is required!'

	},
	rating: {
		type: Number,
		min: 1,
		max: 5,
	}
});

function autopopulate(next) {
	this.populate('author');
	next();
}

reviewSchema.pre('find', autopopulate);
reviewSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Review', reviewSchema);

