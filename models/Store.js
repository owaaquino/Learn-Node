const mongoose = require('mongoose');//mongooes package interface
mongoose.Promise = global.Promise; //add this for deprecation issue in mongoDB
const slug = require('slugs');

const storeSchema = new mongoose.Schema({
	name: {
		type: String,
		trim: true,
		required: 'Please enter a store name!'
	},
	slug: String,
	description: {
		type: String,
		trim: true
	},
	tags: [String],
	// custom mongoDB 
	created: {
		type: Date,
		default: Date.now
	},
	location: {
		type: {
			type: String,
			default: 'Point'
		},
		coordinates: [{
			type: Number,
			required: 'You must supply coordinates!'
		}],
		address: {
			type: String,
			required: 'You must supply an address!'
		}
	},
	photo: String,
	author: {
		type: mongoose.Schema.ObjectId, //geting the Object of another model
		ref: 'User', // ref the model name
		required: 'You must supply an author'
	}
});

// Define our index
storeSchema.index({
	name: 'text',
	description: 'text'
});

storeSchema.index({location: '2dsphere'});

// fn below will work as a midlewae before saving the new store using mongoDb presaved hook
storeSchema.pre('save', async function(next) {
	if(!this.isModified('name')){
		next(); //skip
		return; //stop this fun from running
	}
	this.slug = slug(this.name);
	// find other store that has same name with the new and add a number to become unique
	const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
	const storesWithSlug = await this.constructor.find({ slug: slugRegEx });
	if(storesWithSlug.length) {
		this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
	}
	next();
	// TODO make more resiliant so slugs are unique
}, {
	//optional options to view on your json / object using virtual
	toJSON: {virtuals: true},
	toObject: {virtuals: true}
});


// sorting store by tags
storeSchema.statics.getTagsList = function() {
	return this.aggregate([
		{ $unwind: '$tags' },
		{ $group: { _id: '$tags', count: { $sum: 1}} },
		{ $sort: { count: -1 }}
	]);
};

storeSchema.statics.getTopStores = function() {
	return this.aggregate([
		// Lookup Stores and populate their reviews
		{ $lookup: {
			from: 'reviews', 
			localField: '_id', 
			foreignField: 'store', 
			as: 'reviews'
		}},
		// filter for only items that have 2 or more reviews
		{ $match: {
			'reviews.1': {$exists: true } //'review.1' is how to get index item
		}},
		// Add the average reviews field
		{ $project: {
			photo: '$$ROOT.photo',
			name: '$$ROOT.name',
			reviews: '$$ROOT.reviews',
			slug: '$$ROOT.slug',
			averageRating: { $avg: '$reviews.rating' }
		}},
		// sort it by our new field, highest reviews first
		{ $sort: { averageRating: -1 }},
		// limit to at most 10
		{ $limit: 10 }
	]);
};

//find reviews where the stores _id property === review store property SQL : join
storeSchema.virtual('reviews', {
	ref: 'Review', // what model to Links
	localField: '_id', // which field on the Store model
	foreignField: 'store' // which field on the Review model
});

function autopopulate(next) {
	this.populate('reviews');
	next();
}

storeSchema.pre('find', autopopulate);
storeSchema.pre('findOne', autopopulate);


module.exports = mongoose.model('Store', storeSchema);