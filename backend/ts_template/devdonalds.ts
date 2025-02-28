import express, { Request, Response } from "express";

// ==== Type Definitions, feel free to add or modify ==========================
interface cookbookEntry {
  name: string;
  type: string;
}

interface requiredItem {
  name: string;
  quantity: number;
}

interface recipe extends cookbookEntry {
  requiredItems: requiredItem[];
}

interface ingredient extends cookbookEntry {
  cookTime: number;
}

// =============================================================================
// ==== HTTP Endpoint Stubs ====================================================
// =============================================================================
const app = express();
app.use(express.json());

// Store your recipes here!
const cookbook: any = new Map();

// Task 1 helper (don't touch)
app.post("/parse", (req:Request, res:Response) => {
  const { input } = req.body;

  const parsed_string = parse_handwriting(input)
  if (parsed_string == null) {
    res.status(400).send("this string is cooked");
    return;
  } 
  res.json({ msg: parsed_string });
  return;
  
});

// [TASK 1] ====================================================================
// Takes in a recipeName and returns it in a form that 
const parse_handwriting = (recipeName: string): string | null => {
  // replaces hyphens and underscores with spaces
  let cleaned = recipeName.replace(/[-_]/g, ' ');
    
  // removes all non-alphabetic characters except spaces
  cleaned = cleaned.replace(/[^a-zA-Z\s]/g, '');
      
  // replaces multiple spaces instances with a single space and trim
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
      
  // capitalises first letter of each word
  cleaned = cleaned.split(' ')
  .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
  .join(' ');
      
  return cleaned.length > 0 ? cleaned : null;
}

// [TASK 2] ====================================================================
// Endpoint that adds a CookbookEntry to your magical cookbook
app.post("/entry", (req:Request, res:Response) => {
  const entry = req.body;
  
  // validates 'type' field
  if (entry.type !== "recipe" && entry.type !== "ingredient") {
    return res.status(400).send("Invalid type. Must be 'recipe' or 'ingredient'.");
  }

  // validates name to be unique
  if (cookbook.has(entry.name)) {
    return res.status(400).send("Entry name must be unique.");
  }

  if (entry.type === "ingredient") {
    // validates cookTime for ingredients
    if (typeof entry.cookTime !== "number" || entry.cookTime < 0) {
      return res.status(400).send("Invalid cookTime. Must be a number >= 0.");
    }
  } else if (entry.type === "recipe") {
    // validates requiredItems for recipes
    if (!Array.isArray(entry.requiredItems)) {
      return res.status(400).send("Invalid requiredItems. Must be an array.");
    }
    
    const uniqueItems = new Set();
    for (const item of entry.requiredItems) {
      if (typeof item.name !== "string" || typeof item.quantity !== "number" || item.quantity <= 0) {
        return res.status(400).send("Invalid requiredItem structure.");
      }
      if (uniqueItems.has(item.name)) {
        return res.status(400).send("Duplicate requiredItem names are not allowed.");
      }
      uniqueItems.add(item.name);
    }
  }

  // Store entry in cookbook
  cookbook.set(entry.name, entry);
  
  return res.status(200).send();
});

// [TASK 3] ====================================================================
// Endpoint that returns a summary of a recipe that corresponds to a query name
app.get("/summary", (req:Request, res:Request) => {
  const recipeName = req.query.name;
  if (!cookbook.has(recipeName)) {
    return res.status(400).send("Recipe not found.");
  }

  const recipe = cookbook.get(recipeName);
  if (recipe.type !== "recipe") {
    return res.status(400).send("Requested item is not a recipe.");
  }

  const getRecipeSummary = (recipe) => {
    let cookTime = 0;
    const ingredientsMap = new Map();
    
    const processItems = (items, multiplier = 1) => {
      for (const { name, quantity } of items) {
        if (!cookbook.has(name)) {
          throw new Error("Missing required ingredient or recipe in cookbook.");
        }
        const item = cookbook.get(name);
        if (item.type === "ingredient") {
          cookTime += item.cookTime * quantity * multiplier;
          ingredientsMap.set(name, (ingredientsMap.get(name) || 0) + quantity * multiplier);
        } else if (item.type === "recipe") {
          processItems(item.requiredItems, quantity * multiplier);
        }
      }
    };

    processItems(recipe.requiredItems);
    
    return {
      name: recipe.name,
      cookTime,
      ingredients: Array.from(ingredientsMap.entries()).map(([name, quantity]) => ({ name, quantity }))
    };
  };

  try {
    const summary = getRecipeSummary(recipe);
    res.status(200).json(summary);
  } catch (error) {
    res.status(400).send(error.message);
  }
});

// =============================================================================
// ==== DO NOT TOUCH ===========================================================
// =============================================================================
const port = 8080;
app.listen(port, () => {
  console.log(`Running on: http://127.0.0.1:8080`);
});
