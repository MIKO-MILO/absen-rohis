import { createClient } from "./lib/supabaseServer"

async function test() {
  const supabase = await createClient()
  const result = await supabase.from("admin").select("*")
  console.log(result)
}

test()
