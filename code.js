const MicroBlogBaseAddress = 'https://micro.blog';

function toArray(obj) {
	return Array.prototype.slice.call(obj);
}

function $(identifier) {
	const byId = document.getElementById(identifier);
	if (byId)
		return byId;
	
	const byName = document.getElementsByName(identifier);
	if (byName.length !== 0)
		return toArray(byName);
	
	return toArray(document.getElementsByClassName(identifier));
}

function fetchFollowersForUser(user, token) {
	return new Promise( (resolve, reject) => {
		const request = new XMLHttpRequest();
		request.onreadystatechange = () => {
			const {
				readyState,
				responseText,
				status,
			} = request;
			if (readyState !== XMLHttpRequest.DONE)
				return;
			
			if (status === 200)			
				resolve({ user, followers: JSON.parse(responseText) });
			else
				reject();
		};
		request.open('GET', `${MicroBlogBaseAddress}/users/following/${user}`);	
		request.setRequestHeader('Authorization', `Token ${token}`);
		request.send();
	});
}

function main() {
	function fetchAndCacheFollowersForUser(user, token, existingCache) {
		return new Promise( (resolve, reject) => {
			fetchFollowersForUser(user, token)
				.then( ({ user, followers }) => {
					const cache = Object.freeze(Object.assign({ [user]: followers }, existingCache));
					resolve({ user, followers, cache });
				})
				.catch(reject);
		});
	}

	function renderFollowerTree({ selection, cache, token, view }) {
		function generateFollowerCard(follower, isSelected, onSelection) {
			const div = document.createElement('div');
			div.className = 'follower' + (isSelected ? ' selected' : '');
			div.addEventListener('click', event => onSelection(follower.username));
	
			const img = document.createElement('img');
			img.src = follower.avatar;
			div.appendChild(img);
	
			const header = document.createElement('h4');
			const a = document.createElement('a');
			a.href = follower.url;
			a.appendChild(document.createTextNode(follower.name));
			header.appendChild(a);
			div.appendChild(header);
	
			const p = document.createElement('p');
			p.appendChild(document.createTextNode(`@${follower.username}`));
			div.appendChild(p);
	
			div.appendChild(p);
	
			return div;
		}

		function generateFollowerColumn({ followers, selection, onSelection }) {
			const ul = document.createElement('ul');
			followers.forEach( follower => {
				const li = document.createElement('li');
				li.appendChild(generateFollowerCard(follower, follower.username === selection, onSelection));
				ul.appendChild(li);
			});
			return ul;
		}

		while (view.firstChild)
			view.removeChild(view.firstChild);

		const div = document.createElement('div');
		div.className = 'follower-tree';

		selection.forEach( (currentSelection, index) => {
			const followers = cache[currentSelection];
			const onSelection = username => {
				const nextSelection = selection.slice(0, index+1).concat(username);
				if (!cache[username]) {
					fetchAndCacheFollowersForUser(username, token, cache)
						.then( ({ user, followers, cache }) => renderFollowerTree({ selection: nextSelection, cache, token, view }) );
				}
				else {
					renderFollowerTree({ selection: nextSelection, token, view, cache });
				}
			};
			const column = document.createElement('div');
			column.className = 'follower-column';
			const nextSelection = selection.length >= index+1 ? selection[index+1] : null;
			column.appendChild(generateFollowerColumn({ followers, selection: nextSelection, onSelection }));
			div.appendChild(column);
		});

		view.appendChild(div);
	}
	
	function performStart({ tokenInput, rootUserInput, renderView }) {
		const token = tokenInput.value;
		const username = rootUserInput.value;
		fetchAndCacheFollowersForUser(username, token, {})
			.then( ({ user, followers, cache }) => {
				renderFollowerTree({ selection: [ username ], cache, token, view: renderView });
			});
	}

	function updateStartButtonState(startButton, inputsRequiringValues) {
		startButton.disabled = inputsRequiringValues.some( x => x.value.length === 0 );
	}

	const rootUserInput = $('rootUserInput');
	const tokenInput = $('tokenInput');
	const startButton = $('startButton');
	
	const inputsNecessaryToStart = [rootUserInput, tokenInput];
	inputsNecessaryToStart.map( input => input.addEventListener('input', e => updateStartButtonState(startButton, inputsNecessaryToStart)) );
	startButton.addEventListener('click', event => performStart({ tokenInput, rootUserInput, renderView: $('followerView') }));
}

window.addEventListener('load', main);
