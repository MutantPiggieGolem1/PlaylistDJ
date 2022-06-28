import { spawn } from 'child_process';

function run(args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const process = spawn('python', ['./index.py', ...args]);
    let errors: string[] = []

    process.stdout.on('data', resolve)

    process.stderr.on('data',
      (data) => {errors.push(data.toString())}
    );

    process.on('exit', (code, _) => {
      if (code !== 0) return reject(new Error(errors.join('\n')))
    });
  }).then(r=>JSON.parse(r as string));
}

run(["poo","donk"]).then(console.log)