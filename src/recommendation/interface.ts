import { spawn } from 'child_process';

function run(args: string[]): Promise<{}> {
  return new Promise((resolve, reject) => {
    const process = spawn('python', [__dirname+'/index.py', ...args]);
    let errors: string[] = []

    process.stdout.on('data', resolve)
    process.stderr.on('data',errors.push);

    process.on('exit', (code, _) => {
      if (code !== 0) return reject(new Error(errors.join('\n')))
    });
  }).then(r=>JSON.parse(r as string) as {});
}

run(["0","10"]).then(console.log)