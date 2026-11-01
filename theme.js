try {
    if (localStorage.getItem('sb-theme') === 'dark') document.documentElement.dataset.theme ='dark';
} catch (e) { /* storage blocked, light it is*/ }