// public/js/favorites.js
// Favorites page — shows and manages the user's saved recipes.

(async function () {
  Auth.requireLogin();

  const user = Auth.getUser();
  if (user) {
    document.getElementById('username').textContent = user.username;
    document.getElementById('avatar').textContent = user.username[0].toUpperCase();
  }

  const logoutBtn = document.getElementById('logoutBtn');
  const logoutPopover = document.getElementById('logoutPopover');

  logoutBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    logoutPopover.classList.toggle('show');
  });
  document.getElementById('logoutConfirm').addEventListener('click', () => {
    Auth.clear();
    window.location.href = '/login.html';
  });
  document.getElementById('logoutCancel').addEventListener('click', () => {
    logoutPopover.classList.remove('show');
  });
  document.addEventListener('click', (e) => {
    if (!logoutPopover.contains(e.target) && e.target !== logoutBtn) {
      logoutPopover.classList.remove('show');
    }
  });

  const favStatus = document.getElementById('favStatus');
  const favGrid = document.getElementById('favGrid');

  try {
    const result = await Api.getFavorites();
    const favorites = result.data.favorites;

    favStatus.style.display = 'none';

    if (!favorites || favorites.length === 0) {
      favStatus.innerHTML = `
        <div class="empty">
          <p>No saved recipes yet.</p>
          <a href="/index.html" class="btn btn-accent" style="margin-top:1rem;display:inline-flex;">Find recipes</a>
        </div>`;
      favStatus.style.display = 'block';
      return;
    }

    renderFavorites(favorites);
  } catch (err) {
    favStatus.innerHTML = `<div class="empty">${escapeHtml(err.message)}</div>`;
  }

  function renderFavorites(favorites) {
    favGrid.innerHTML = '';
    favorites.forEach((r) => {
      const card = document.createElement('article');
      card.className = 'recipe-card';
      card.innerHTML = `
        <div class="recipe-card-img-wrap">
          <img class="recipe-card-img" alt="" />
          <button class="favorite-btn favorited" aria-label="Remove from favorites">&#9829;</button>
        </div>
        <div class="recipe-card-body">
          <h3 class="recipe-card-title"></h3>
        </div>
      `;
      card.querySelector('img').src = r.image || '';
      card.querySelector('img').alt = r.title;
      card.querySelector('h3').textContent = r.title;

      const favBtn = card.querySelector('.favorite-btn');
      favBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        favBtn.disabled = true;
        try {
          await Api.toggleFavorite(r.id, r.title, r.image || '');
          card.remove();
          if (favGrid.children.length === 0) {
            favStatus.innerHTML = `
              <div class="empty">
                <p>No saved recipes yet.</p>
                <a href="/index.html" class="btn btn-accent" style="margin-top:1rem;display:inline-flex;">Find recipes</a>
              </div>`;
            favStatus.style.display = 'block';
          }
        } catch (err) {
          alert('Could not remove favorite: ' + err.message);
          favBtn.disabled = false;
        }
      });

      card.addEventListener('click', () => {
        window.location.href = `/recipe.html?id=${r.id}`;
      });

      favGrid.appendChild(card);
    });
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }
})();
