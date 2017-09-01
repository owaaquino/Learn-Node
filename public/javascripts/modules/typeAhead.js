import axios from 'axios';
import dompurify from 'dompurify';

function searchResultHTML(stores) {
	return stores.map(store => {
		return `
			<a href="/store/${store.slug}" class="search__results">
				<strong>${store.name}</strong>
			</a>
		`;
	}).join('');
}

function typeAhead(search) {
	if(!search) return;

	const searchInput = search.querySelector('input[name="search"]');
	const searchResult = search.querySelector('.search__results');

	searchInput.on('input', function() {
		// if there is no value, quit it!
		if(!this.value) {
			searchResult.style.display = 'none';
			return; //stop
		}

		// show the search results!
		searchResult.style.display = 'block';
		searchResult.innerHTML = '';

		axios
			.get(`/api/search?q=${this.value}`)
			.then(res => {
				if ( res.data.length ) {
					searchResult.innerHTML = dompurify.sanitize(searchResultHTML(res.data));
					 return;
				}
				//tell nothing came back
				searchResult.innerHTML = dompurify.sanitize(`<div class="search__result>No Result for ${this.value} found!</div>`);
			})
			.catch( err => {
				console.error(err);
			});
	});

	// handle keyboard
	searchInput.on('keyup', (e) => {
		// if they aren't pressing up down or ente
		if (![38, 40, 13].includes(e.keyCode)){
			return;
		}
		const activeClass = 'search__result--active';

		const current = search.querySelector(`.${activeClass}`);
		const items = search.querySelectorAll('.search__result');
		let next;

		if (e.keyCode === 40 && current) {
			next = current.nextElementSibling || item[0];
		} else if (e.keyCode === 40) {
			next = items[0];
		} else if (e.keyCode === 38 && current ) {
			next = current.previousElementSibling || items[items.length - 1];
		} else if ( e.keyCode === 38) {
			next = items[items.length - 1];
		} else if ( e.keyCode === 13 && current.href) {
			window.location = current.href;
			return;
		}
		if (current) {
			current.classList.remove(activeClass);
		}
		next.classList.add(activeClass);
	});
};

export default typeAhead;