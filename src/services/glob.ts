export const globScript = `
import fg from 'fast-glob';

const includes = process.argv[2] ? process.argv[2].split(',') : ['**/*'];
const excludes = process.argv[3] ? process.argv[3].split(',') : [];

async function findFiles() {
  try {
    const files = await fg(includes, {
      cwd: 'repo',
      ignore: [...excludes, '**/node_modules/**', '**/.*/**'],
      dot: false,
      absolute: false,
      onlyFiles: true,
      markDirectories: false
    });
    
    console.log(JSON.stringify(files));
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

findFiles();
`; 