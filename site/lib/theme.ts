/** Where a theme picked with the sun and moon is kept. Without one the site follows the system. */
export const THEME_KEY = "internradar:theme";

/** Runs in <head> before the page paints, so a picked theme never flashes the other one first. */
export const themeScript = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
