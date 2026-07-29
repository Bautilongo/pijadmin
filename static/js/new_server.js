document.getElementById('create-server-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const form = e.currentTarget;
  const data = {
    name: form.name.value.trim(),
    version: form.version.value.trim(),
    software: form.software.value
  };

  try {
    const res = await fetch('/api/servers/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const modal = document.getElementById('error-modal');
      document.getElementById('error-modal-message').innerText = body.message || 'Ha ocurrido un error inesperado.';
      modal.showModal();
      return;
    }

    window.location.href = '/servers';
  } catch (err) {
    const modal = document.getElementById('error-modal');
    document.getElementById('error-modal-message').innerText = 'No se pudo contactar con el servidor. Revisa la conexión e inténtalo de nuevo.';
    modal.showModal();
  }
});

document.getElementById('error-modal-button').addEventListener('click', () => {
  document.getElementById('error-modal').close();
});