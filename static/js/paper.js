async function getPaperVersions() {
    let versions = [];
    try {
        const r = fetch('https://fill.papermc.io/v3/projects/paper/versions')
        const data = await (await r).json();
        for (const version of data.versions) {
            if (!version.version.id.includes('rc') && !version.version.id.includes('pre')) {
                versions.push(version.version.id);
            }
        }
    }
    catch (error) {
        console.error('Error fetching Paper versions:', error);
    }
    return versions;
}