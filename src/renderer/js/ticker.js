let id;
onmessage = (e) => { clearInterval(id); id = setInterval(() => postMessage(Date.now()), e.data); };
