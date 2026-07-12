async function test() {
  const url = 'https://lh3.googleusercontent.com/a/ACg8ocJBKdWYZ7_CNCYocQzNod1zzGL9K1CZpCl-rtiz4CJGcPLl0qM=s96-c';
  try {
    const res = await fetch(url, {
      headers: {
        'Referer': 'http://localhost:4000/'
      }
    });
    console.log("Status with Referer:", res.status);
  } catch (e) {
    console.error("Fetch error:", e);
  }
}
test();
