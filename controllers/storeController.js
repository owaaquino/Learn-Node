const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const User = mongoose.model('User');
const multer = require('multer');
const jimp = require('jimp'); // 
const uuid = require('uuid'); // method that creates a unique ids

const multerOptions = {
	storage: multer.memoryStorage(),
	fileFilter: function(req, file, next) {
		const isPhoto = file.mimetype.startsWith('image/');
		if(isPhoto) {
			next(null, true);
		} else {
			next({ message: 'That filetype is not allowed!'}, false);
		}
	}
}

exports.homePage = (req, res) => {
	res.render('index', {title: 'Welcome'});
};

exports.addStore = (req, res) => {
	res.render('editStore', {title: 'Add Store'});
};

exports.upload = multer(multerOptions).single('photo');

// this is a custom middleware
exports.resize = async (req, res, next) => {
	//check if there is no new file to resize
	if(!req.file) {
		next(); // skip to the next middleware
		return;
	}
	const extension = req.file.mimetype.split('/')[1];
	req.body.photo = `${uuid.v4()}.${extension}`;
	/// now we resize
	const photo = await jimp.read(req.file.buffer);
	await photo.resize(800, jimp.AUTO);
	await photo.write(`./public/uploads/${req.body.photo}`);
	//once we have written the photo to our filesystem, keep going!
	next();
}


//note: when assigning async function make sure to add catchErrors in the index.js / route

exports.createStore = async (req, res) => {
	req.body.author = req.user._id;
	const store = await (new Store(req.body)).save();
	// await store.save();
	req.flash('success', `Successfully Created ${store.name}. Care to leave a review?`);
	res.redirect(`/store/${store.slug}`);
};

exports.getStores = async (req, res) => {
	const page = req.params.page || 1;
	const limit = 4;
	const skip = (page * limit) - limit;

	// 1. Query the database for a list of all stores
	const storesPromise =  Store
		.find()
		.skip(skip)
		.limit(limit)
		.sort({ created: 'desc'});

		const countPromise = Store.count();

		const [stores, count] = await Promise.all([storesPromise, countPromise]);

		const pages = Math.ceil(count / limit); 
		if (!stores.length && skip) {
			req.flash('info', `Hey! You asked for page ${page}. But that doesn't exist anymore. So I put you on page ${pages}`);
			res.redirect(`/stores/page/${pages}`);
			return;
		}

		res.render('stores', {title: 'Stores', stores: stores, page, pages, count});
};

// fn comparing if the user and author is the same
const confirmOwner = (store, user) => {
	if(!store.author.equals(user._id)){
		throw Error('You must own a store to edit it!');
	}
};

exports.editStore = async (req, res) => {
	//1. find the store given the ID
	const store = await Store.findOne({ _id: req.params.id });

	//2. confirm they are the owner of the store
	confirmOwner(store, req.user);
	//3. render out the edit form so the user can update their store
	res.render('editStore', {title: `Edit ${store.name}`, store: store});
};

exports.updateStore = async (req, res) => {
	//set the location data to be a point
	req.body.location.type = 'Point';
	//find and update the store
	const store = await Store.findOneAndUpdate({ _id: req.params.id}, req.body, {
		new: true, // return the new store instead of the old one
		runValidators: true
	}).exec();
	req.flash('success', `Successfully updated <strong>${store.name}</strong>.
		<a href="/stores/${store.slug}">View Store</a>`)
	//redirecct them the store and tell them it worked
	res.redirect(`/stores/${store._id}/edit`);
};

exports.getStoreBySlug = async (req, res) => {
	const store = await Store.findOne({slug: req.params.slug }).populate('author reviews');
	if(!store) {
		return next();
	}
	res.render('store', { store: store, title: store.name});
};

exports.getStoresByTag = async (req, res) => {
	const tag = req.params.tag;
	const tagQuery = tag || { $exists: true}
	// waiting for multiple item 2 queries
	const tagsPromise  = Store.getTagsList();
	const storePromise = Store.find( { tags: tagQuery});

	const [tags, stores] = await Promise.all([tagsPromise, storePromise]);

	res.render('tags', { tags: tags, title: 'Tags', tag: tag, stores: stores})

};

exports.searchStores = async (req, res) => {
	const stores = await Store
	.find({
		$text: {
			$search: req.query.q
		}
	}, {
		score: { $meta: 'textScore' }
	})
	.sort({
		score: { $meta: 'textScore'}
	})
	// limit to 5 results
	.limit(5);
	res.json(stores);
};

exports.mapStores = async (req, res) => {
	const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
	const q = {
		location: {
			$near: {
				$geometry: {
					type: 'Point',
					coordinates: coordinates
				},
				$maxDistance: 10000 // 10km
			}
		}
	}

	const stores = await Store.find(q).select('slug name description location photo').limit(10); // .select() enables you to select a specific item for json to be displayed 
	res.json(stores);
};

exports.mapPage = (req, res) => {
	res.render('map', { title: 'Map' });
};

exports.heartStore = async (req, res) => {
	const hearts = req.user.hearts.map(obj => obj.toString());
	const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
	const user = await User
		.findByIdAndUpdate(req.user._id,
			{ [operator]: { hearts: req.params.id }},
			{ new: true }
		);
	res.json(user);
};

exports.getHearts = async (req, res) => {
	const stores = await Store.find({
		_id: { $in: req.user.hearts }
	});
	res.render('stores', { title: 'Hearted Stores', stores: stores});
};

exports.getTopStores = async (req, res) => {
	const stores = await Store.getTopStores();
	res.render('topStores', { stores, title : 'Top Stores'});
};