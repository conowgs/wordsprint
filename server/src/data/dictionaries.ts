// Seed dictionaries. Small but real, so the game works immediately after
// `npm run seed` with zero manual file creation. In production you would
// expand these from curated open datasets (GeoNames, name corpora, etc.)
// during an OFFLINE prep step — never via a live API during gameplay.

import type { Category } from "@wordsprint/shared";

export const SEED: Record<Category, string[]> = {
  name: [
    "Aarav","Aditi","Amit","Ananya","Arjun","Bhavya","Ben","Chris","Chitra","Deepa",
    "Dev","Ella","Emma","Farah","Gaurav","Hannah","Isha","Ishaan","Jack","Jaya",
    "Karan","Kavya","Liam","Maya","Meera","Mark","Neha","Noah","Omar","Priya",
    "Pooja","Rahul","Riya","Rohan","Sara","Sanjay","Simran","Sneha","Tarun","Tina",
    "Uma","Varun","Vikram","Vyshnav","William","Yash","Zara","Nikhil","Sameer","Anusha",
  ],
  place: [
    "Agra","Ahmedabad","Australia","Austin","Bangalore","Berlin","Bhopal","Boston","Brazil","Cairo",
    "Canada","Chennai","China","Cuba","Delhi","Denmark","Dubai","Egypt","France","Germany",
    "Goa","India","Indore","Italy","Jaipur","Japan","Kanpur","Kenya","London","Madrid",
    "Milan","Mumbai","Nagpur","Nepal","Norway","Paris","Perth","Peru","Pune","Qatar",
    "Rome","Russia","Salem","Seoul","Spain","Surat","Sydney","Texas","Thane","Tokyo",
  ],
  animal: [
    "Ant","Antelope","Bat","Bear","Bison","Camel","Cat","Cheetah","Cobra","Cow",
    "Crab","Crow","Deer","Dog","Dolphin","Donkey","Duck","Eagle","Elephant","Falcon",
    "Fox","Frog","Giraffe","Goat","Hawk","Horse","Iguana","Jaguar","Kangaroo","Koala",
    "Leopard","Lion","Lizard","Mole","Monkey","Moose","Mouse","Otter","Owl","Panda",
    "Parrot","Penguin","Pig","Rabbit","Salmon","Seal","Shark","Sloth","Snake","Swan",
    "Tiger","Toad","Turtle","Whale","Wolf","Zebra",
  ],
  thing: [
    "Anchor","Apple","Ball","Basket","Bell","Book","Bottle","Box","Broom","Brush",
    "Bucket","Button","Camera","Candle","Chair","Clock","Cloth","Comb","Cup","Desk",
    "Door","Fan","Fork","Glass","Hammer","Jar","Kettle","Key","Knife","Ladder",
    "Lamp","Mat","Mirror","Mug","Needle","Pan","Pencil","Phone","Plate","Pot",
    "Ring","Rope","Sofa","Spoon","Stone","Table","Torch","Towel","Umbrella","Wallet",
  ],
};
