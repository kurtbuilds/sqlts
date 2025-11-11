use clap::Parser;

#[derive(Parser, Debug)]
#[command(name = "cli")]
#[command(about = "A CLI application", long_about = None)]
struct Args {
    /// Name to greet
    #[arg(short, long)]
    name: Option<String>,
}

fn main() {
    let args = Args::parse();

    if let Some(name) = args.name {
        println!("Hello, {}!", name);
    } else {
        println!("Hello, world!");
    }
}
