async function test() {
    try {
        console.log('Hitting endpoint...');
        const res = await fetch('http://localhost:3000/team-manager/pending');
        console.log('Status:', res.status);
        if (res.ok) {
            const data = await res.json();
            console.log(JSON.stringify(data, null, 2));
        } else {
            const text = await res.text();
            console.log('Error body:', text);
        }
    } catch (e) {
        console.log('Fetch error:', e.message);
    }
}
test();
