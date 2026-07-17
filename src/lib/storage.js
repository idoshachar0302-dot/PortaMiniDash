export async function getItem(key) {
  return localStorage.getItem(key);
}

export async function setItem(key, value) {
  localStorage.setItem(key, value);
}

export async function removeItem(key) {
  localStorage.removeItem(key);
}
