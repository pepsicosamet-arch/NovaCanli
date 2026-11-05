let id;
onmessage = (e) => { clearInterval(id); id = setInterval(() => postMessage(0), e.data); };
