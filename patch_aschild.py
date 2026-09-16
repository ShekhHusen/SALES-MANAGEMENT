import sys

with open("src/pages/quotations.tsx", "r") as f:
    content = f.read()

# Replace <PopoverTrigger asChild> with just <PopoverTrigger>
# But wait, Base UI component requires `render` prop instead of `asChild`. Let's just remove Button wrapping entirely or remove asChild and let it render a button natively.
target = """    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={`w-full justify-between text-left h-10 ${!value ? "text-muted-foreground font-normal" : "font-bold"} ${className}`}
        >"""
        
# Instead of Button, just let PopoverTrigger be the button, because PopoverPrimitive.Trigger renders a button. We can apply the button classes to it directly, but we can't use Button component. Let's just pass render={<Button />}!
# Actually base-ui PopoverTrigger takes `render={<Button />}` pattern. Let's check base-ui docs. It usually renders a button. We can just use standard HTML button or pass className.

replacement = """    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={`inline-flex shrink-0 items-center border border-slate-200 bg-white hover:bg-slate-50 rounded-lg text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 w-full justify-between text-left h-10 px-3 ${!value ? "text-muted-foreground font-normal" : "font-bold"} ${className}`}
      >"""

# We need to remove the closing </Button> as well
content = content.replace(target, replacement)
content = content.replace("""        </Button>\n      </PopoverTrigger>""", """      </PopoverTrigger>""")

with open("src/pages/quotations.tsx", "w") as f:
    f.write(content)

print("asChild fixed")
