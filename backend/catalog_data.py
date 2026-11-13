"""The complete BUDDY herbal catalogue.

Every soap, powder, pack, herb and base we work with. This file is the
single source of truth that seeds the SQL database.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Master ingredient list. price_add is the extra cost of adding that herb to
# a custom bar in the "Custom Studio".
# ---------------------------------------------------------------------------
INGREDIENTS: list[dict] = [
    {
        "slug": "essential_oil",
        "name": "Essential Oil Blend",
        "tamil_name": "அத்தியாவசிய எண்ணெய்",
        "kind": "extra",
        "benefit": "Aromatherapy grade oils that calm the mind and leave a soft, natural scent on the skin — never synthetic perfume.",
        "note": "A few drops per batch is all it takes.",
        "color": "#C2A25A",
        "price_add": 15,
    },
    {
        "slug": "ecapsule",
        "name": "Herbal Ecapsule",
        "tamil_name": "மூலிகை என்கேப்சூல்",
        "kind": "extra",
        "benefit": "A slow release capsule of concentrated herb extract, so the actives keep working on your skin long after the bath.",
        "note": "Our signature slow-release technology.",
        "color": "#8E6BA8",
        "price_add": 20,
    },
    {
        "slug": "kuppaimeni_leaf",
        "name": "Kuppaimeni Leaf",
        "tamil_name": "குப்பைமேனி இலை",
        "kind": "herb",
        "benefit": "The village healer for itching, rashes and heat boils. Antibacterial and famously kind to eczema-prone skin.",
        "note": "Sun dried, stone ground, never bleached.",
        "color": "#3F7A46",
        "price_add": 15,
    },
    {
        "slug": "neem_powder",
        "name": "Neem Powder",
        "tamil_name": "வேப்பிலைப் பொடி",
        "kind": "herb",
        "benefit": "Nature's antiseptic. Fights acne, body odour and fungal infections in one gentle sweep.",
        "note": "Shade dried to protect the bitter actives.",
        "color": "#2E6B34",
        "price_add": 12,
    },
    {
        "slug": "poolan_kilangu",
        "name": "Poolan Kilangu",
        "tamil_name": "பூலான் கிழங்கு",
        "kind": "herb",
        "benefit": "A cooling Tamil root that calms body heat, soothes sun-flushed skin and takes the sting out of a hot day.",
        "note": "Wild harvested in the Western Ghats.",
        "color": "#B98B4E",
        "price_add": 18,
    },
    {
        "slug": "virali_manjal",
        "name": "Virali Manjal",
        "tamil_name": "விரலி மஞ்சள்",
        "kind": "herb",
        "benefit": "Wild turmeric, the golden glow herb. Anti-inflammatory, fades marks and evens out skin tone.",
        "note": "Not the kitchen turmeric — this one does not stain.",
        "color": "#D6A419",
        "price_add": 18,
    },
    {
        "slug": "manjistha_powder",
        "name": "Manjistha Powder",
        "tamil_name": "மஞ்சிஷ்டா பொடி",
        "kind": "herb",
        "benefit": "Ayurveda's blood purifier. Works inside the skin to clear dullness, pigmentation and patchy tone.",
        "note": "The root, not the filler stem.",
        "color": "#A9483E",
        "price_add": 22,
    },
    {
        "slug": "vettiver",
        "name": "Vettiver",
        "tamil_name": "வெட்டிவேர்",
        "kind": "herb",
        "benefit": "Khus root: cooling, earthy and pore tightening. The scent of a temple courtyard after rain.",
        "note": "Aged root, hand washed in river water.",
        "color": "#8C7A4E",
        "price_add": 16,
    },
    {
        "slug": "panner_rose",
        "name": "Panner Rose",
        "tamil_name": "பன்னீர் ரோஜா",
        "kind": "herb",
        "benefit": "Steam distilled rose that hydrates, soothes redness and turns an ordinary bath into a ritual.",
        "note": "Petal powder plus a whisper of rose water.",
        "color": "#C9557B",
        "price_add": 20,
    },
    {
        "slug": "alovera_gel",
        "name": "Aloe Vera Gel",
        "tamil_name": "கற்றாழை ஜெல்",
        "kind": "extra",
        "benefit": "Cold pressed gel that holds moisture in the skin, so the bar never leaves you feeling tight or dry.",
        "note": "Cut and pressed the same morning.",
        "color": "#5FAF6A",
        "price_add": 14,
    },
    {
        "slug": "hibiscus",
        "name": "Hibiscus Leaf & Flower",
        "tamil_name": "செம்பருத்தி",
        "kind": "herb",
        "benefit": "Rich in natural AHAs and mucilage — softens skin and strengthens hair roots at the same time.",
        "note": "Leaves and petals both, never one without the other.",
        "color": "#B5384B",
        "price_add": 16,
    },
    {
        "slug": "fenugreek",
        "name": "Fenugreek",
        "tamil_name": "வெந்தயம்",
        "kind": "herb",
        "benefit": "Vendhayam: a gentle scalp tonic that fights dandruff and makes hair slip-through soft.",
        "note": "Soaked, sun dried, then milled.",
        "color": "#B79B57",
        "price_add": 12,
    },
    {
        "slug": "greengram",
        "name": "Green Gram",
        "tamil_name": "பாசிப்பயறு",
        "kind": "herb",
        "benefit": "Pasi payaru: the traditional ubtan base. Micro exfoliation that leaves skin like silk.",
        "note": "Stone milled to keep the grain soft.",
        "color": "#7FA84E",
        "price_add": 12,
    },
    {
        "slug": "chikakai",
        "name": "Chikakai",
        "tamil_name": "சிகைக்காய்",
        "kind": "herb",
        "benefit": "The original shampoo pod. Cleanses the scalp without stripping it and adds natural body to hair.",
        "note": "Whole pods, sun dried.",
        "color": "#6B4A2C",
        "price_add": 16,
    },
    {
        "slug": "soap_nuts",
        "name": "Soap Nuts",
        "tamil_name": "கடுகாய்",
        "kind": "herb",
        "benefit": "Kadukai: nature's own saponin lather, wonderfully mild on a sensitive scalp.",
        "note": "Deshelled by hand.",
        "color": "#8A6A45",
        "price_add": 16,
    },
    {
        "slug": "kasthuri_manjal",
        "name": "Kasthuri Manjal",
        "tamil_name": "கஸ்தூரி மஞ்சள்",
        "kind": "herb",
        "benefit": "The bridal turmeric. Softens blemishes and gives the famous pre-wedding glow.",
        "note": "The fragrant variety, never the dye.",
        "color": "#E4B93C",
        "price_add": 20,
    },
    {
        "slug": "sandal",
        "name": "Sandalwood",
        "tamil_name": "சந்தனம்",
        "kind": "herb",
        "benefit": "Chandan: cooling, calming and deeply fragrant. The classic temple ritual powder.",
        "note": "Fine powder, no fillers.",
        "color": "#D2A96B",
        "price_add": 24,
    },
    {
        "slug": "multani_mitti",
        "name": "Multani Mitti",
        "tamil_name": "முல்தானி மட்டி",
        "kind": "herb",
        "benefit": "Fuller's earth that drinks up excess oil, lifts blackheads and leaves a clean matte finish.",
        "note": "Sun sterilised clay.",
        "color": "#B98F6B",
        "price_add": 14,
    },
]

# ---------------------------------------------------------------------------
# Soap bases the customer can choose from in the Custom Studio
# ---------------------------------------------------------------------------
BASES: list[dict] = [
    {
        "slug": "coconut",
        "name": "Coconut Oil Base",
        "tamil_name": "தேங்காய் எண்ணெய்",
        "benefit": "Cold pressed coconut oil with a cloud of natural lather. The everyday classic.",
        "price_add": 10,
        "color": "#F6F1E1",
        "swatch_from": "#FBF6E7",
        "swatch_to": "#DBCBA4",
        "tag": "Everyday",
    },
    {
        "slug": "goat_milk",
        "name": "Goat Milk Base",
        "tamil_name": "ஆட்டுப் பால்",
        "benefit": "Creamy lactic acid that gently resurfaces skin and keeps it baby soft.",
        "price_add": 40,
        "color": "#F7F0DE",
        "swatch_from": "#FFFDF6",
        "swatch_to": "#E6D8BC",
        "tag": "Softest",
    },
    {
        "slug": "glycerin",
        "name": "Vegetable Glycerin Base",
        "tamil_name": "கிளிசரின்",
        "benefit": "A clear humectant bar — the kindest choice for sensitive, reactive skin.",
        "price_add": 0,
        "color": "#EFEAD8",
        "swatch_from": "#FBF8EC",
        "swatch_to": "#CFC7AE",
        "tag": "Sensitive skin",
    },
    {
        "slug": "charcoal",
        "name": "Activated Charcoal Base",
        "tamil_name": "செயலூக்கப்பட்ட கரி",
        "benefit": "A detox magnet for pollution, oil and city grime. Deeply cleansing.",
        "price_add": 30,
        "color": "#3A3A38",
        "swatch_from": "#6C6C68",
        "swatch_to": "#1E1E1C",
        "tag": "Detox",
    },
]

_ING = {i["slug"]: i for i in INGREDIENTS}
_BASE = {b["slug"]: b for b in BASES}


def _ing(slug: str, role: str = "") -> dict:
    src = _ING[slug]
    return {
        "ingredient_slug": slug,
        "name": src["name"],
        "tamil_name": src["tamil_name"],
        "role": role or src["benefit"].split(".")[0],
        "color": src["color"],
    }


def _benefit(title: str, detail: str) -> dict:
    return {"title": title, "detail": detail}


# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------
PRODUCTS: list[dict] = [
    {
        "slug": "kuppaimeni-soap",
        "name": "Kuppaimeni Soap",
        "tamil_name": "குப்பைமேனி சோப்",
        "category": "soap",
        "shape": "oval",
        "tagline": "The village healer for angry, itchy skin",
        "description": (
            "Kuppaimeni (Acalypha indica) has been Tamil Nadu's first answer to itching, "
            "heat rash and stubborn patches for generations. We sun dry the leaves, stone grind "
            "them and fold them into a coconut oil bar with neem and aloe. The lather is soft, "
            "the scent is green and earthy, and the relief is almost immediate."
        ),
        "base_price": 149,
        "mrp": 199,
        "weight": "100 g",
        "badge": "Bestseller",
        "color_from": "#2F6B3F",
        "color_to": "#9CCB74",
        "accent": "#E9F5C9",
        "base_layer": "coconut",
        "is_featured": True,
        "sort_order": 1,
        "ingredients": [
            _ing("kuppaimeni_leaf", "Stops itching & rashes"),
            _ing("neem_powder", "Antibacterial shield"),
            _ing("alovera_gel", "Soothes & hydrates"),
            _ing("essential_oil", "Calming natural scent"),
        ],
        "benefits": [
            _benefit("Relief from itching", "Calms heat rash, eczema flare-ups and insect bite irritation within days."),
            _benefit("Fades old marks", "Kuppaimeni gently encourages new skin, softening scars left by scratching."),
            _benefit("Antibacterial wash", "Neem and kuppaimeni together keep odour and breakouts away all day."),
            _benefit("Safe for daily use", "Coconut oil base with no parabens and no synthetic perfume."),
        ],
    },
    {
        "slug": "neem-soap",
        "name": "Neem Soap",
        "tamil_name": "வேப்பிலை சோப்",
        "category": "soap",
        "shape": "leaf",
        "tagline": "Everyday antibacterial armour",
        "description": (
            "Our neem bar is the one everybody in the family reaches for. Cold pressed coconut "
            "base, a generous dose of shade dried neem powder and a slow release herbal capsule "
            "that keeps working after you towel off. Bitter to germs, never to your skin."
        ),
        "base_price": 129,
        "mrp": 179,
        "weight": "100 g",
        "badge": "Family favourite",
        "color_from": "#1F5A2C",
        "color_to": "#7BA84F",
        "accent": "#DCEFC4",
        "base_layer": "coconut",
        "is_featured": True,
        "sort_order": 2,
        "ingredients": [
            _ing("neem_powder", "Antiseptic & acne control"),
            _ing("ecapsule", "Slow release herb actives"),
            _ing("alovera_gel", "Keeps the bar gentle"),
            _ing("essential_oil", "Fresh herbal finish"),
        ],
        "benefits": [
            _benefit("Clears acne & body odour", "Neem's antibacterial action targets the bacteria behind both."),
            _benefit("Fights fungal infections", "Ringworm, athlete's foot and dandruff respond well to regular use."),
            _benefit("Calms sun rash", "Aloe keeps a hot, itchy back comfortable through summer."),
            _benefit("Purifies pores", "A gentle daily deep clean for oily, city-stressed skin."),
        ],
    },
    {
        "slug": "poolan-virali-manjal-soap",
        "name": "Poolan Kilangu & Virali Manjal Soap",
        "tamil_name": "பூலான் கிழங்கு விரலி மஞ்சள் சோப்",
        "category": "soap",
        "shape": "hex",
        "tagline": "Cooling glow, straight from the soil",
        "description": (
            "A bar built for heat. Poolan kilangu cools the body from the outside in, while virali "
            "manjal — the wild turmeric that does not stain — brings the famous golden glow. "
            "Manjistha evens the tone and vettiver leaves a temple-courtyard calm behind."
        ),
        "base_price": 169,
        "mrp": 219,
        "weight": "100 g",
        "badge": "Cooling",
        "color_from": "#8A6A1E",
        "color_to": "#E7C45A",
        "accent": "#FFF3C9",
        "base_layer": "goat_milk",
        "is_featured": True,
        "sort_order": 3,
        "ingredients": [
            _ing("poolan_kilangu", "Cools body heat"),
            _ing("virali_manjal", "Golden glow, no stain"),
            _ing("manjistha_powder", "Evens skin tone"),
            _ing("vettiver", "Earthy cooling scent"),
            _ing("essential_oil", "Light floral lift"),
        ],
        "benefits": [
            _benefit("Cools body heat", "Ideal after long hours in the sun or for heat boils and prickly heat."),
            _benefit("Natural glow", "Virali manjal brightens without the orange tint of kitchen turmeric."),
            _benefit("Evens pigmentation", "Manjistha works on patchy tone around the neck, elbows and knees."),
            _benefit("Calming aroma", "Vettiver root brings a grounded, spa-like finish to your bath."),
        ],
    },
    {
        "slug": "manjistha-soap",
        "name": "Manjistha Soap",
        "tamil_name": "மஞ்சிஷ்டா சோப்",
        "category": "soap",
        "shape": "round",
        "tagline": "For skin that looks lit from within",
        "description": (
            "Manjistha is Ayurveda's great blood purifier, and here it is paired with panner rose, "
            "wild turmeric and aloe in a creamy goat milk base. Weeks of use leaves skin clearer, "
            "softer and noticeably more even — the quiet kind of glow."
        ),
        "base_price": 179,
        "mrp": 229,
        "weight": "100 g",
        "badge": "Glow ritual",
        "color_from": "#7A2434",
        "color_to": "#D96E7E",
        "accent": "#FFE1E6",
        "base_layer": "goat_milk",
        "is_featured": True,
        "sort_order": 4,
        "ingredients": [
            _ing("manjistha_powder", "Clears dullness & pigmentation"),
            _ing("panner_rose", "Hydrates and perfumes"),
            _ing("virali_manjal", "Soft golden brightening"),
            _ing("alovera_gel", "Moisture lock"),
            _ing("essential_oil", "Rose-forward scent"),
        ],
        "benefits": [
            _benefit("Blood purifying herbs", "Manjistha supports clearer skin from the inside out."),
            _benefit("Fades dark spots", "Regular use softens acne marks and sun spots."),
            _benefit("Brightens dull tone", "The rose and turmeric pair lift tired, grey-looking skin."),
            _benefit("Silky texture", "Goat milk lactic acid leaves skin smooth, not squeaky."),
        ],
    },
    {
        "slug": "herbal-soap",
        "name": "Herbal Soap",
        "tamil_name": "மூலிகை சோப்",
        "category": "soap",
        "shape": "square",
        "tagline": "The full Tamil pharmacopoeia in one bar",
        "description": (
            "Our everything bar. Kuppaimeni, neem, manjistha, vettiver and aloe in a balanced blend "
            "that suits every skin type in the house. If you only ever buy one soap from us, this is "
            "the one that never disappoints."
        ),
        "base_price": 159,
        "mrp": 209,
        "weight": "100 g",
        "badge": "All-rounder",
        "color_from": "#33562F",
        "color_to": "#A9BE6B",
        "accent": "#EDF2D3",
        "base_layer": "coconut",
        "is_featured": True,
        "sort_order": 5,
        "ingredients": [
            _ing("kuppaimeni_leaf", "Skin calming"),
            _ing("neem_powder", "Antibacterial"),
            _ing("manjistha_powder", "Tone evening"),
            _ing("vettiver", "Cooling root"),
            _ing("alovera_gel", "Hydration"),
            _ing("essential_oil", "Balanced scent"),
        ],
        "benefits": [
            _benefit("All-in-one balance", "Cleansing, calming and brightening in a single daily bar."),
            _benefit("Deep but gentle clean", "Lifts grime without stripping the skin barrier."),
            _benefit("Mild exfoliation", "Herb powders polish rough elbows, knees and heels."),
            _benefit("Family friendly", "Gentle enough for teenagers and grandparents alike."),
        ],
    },
    {
        "slug": "rose-soap",
        "name": "Rose Soap",
        "tamil_name": "ரோஜா சோப்",
        "category": "soap",
        "shape": "rose",
        "tagline": "Panner rose, bottled as a bar",
        "description": (
            "Steam distilled panner rose, aloe gel and a whisper of essential oil in a soft goat "
            "milk base. This is the bar for dry, tight, sensitive skin and for anyone who wants their "
            "bathroom to smell like a flower shop."
        ),
        "base_price": 149,
        "mrp": 199,
        "weight": "100 g",
        "badge": "Hydrating",
        "color_from": "#B0446A",
        "color_to": "#F1A7BE",
        "accent": "#FFE7EE",
        "base_layer": "goat_milk",
        "is_featured": True,
        "sort_order": 6,
        "ingredients": [
            _ing("panner_rose", "Hydrating rose"),
            _ing("alovera_gel", "Deep moisture"),
            _ing("vettiver", "Cooling balance"),
            _ing("essential_oil", "Soft floral scent"),
        ],
        "benefits": [
            _benefit("Hydrates dry skin", "Rose and aloe hold water in the skin through the day."),
            _benefit("Soothes redness", "Anti-inflammatory petals calm windburn and razor burn."),
            _benefit("Aroma ritual", "Real distilled rose, never synthetic fragrance oil."),
            _benefit("Luxurious lather", "A dense, creamy foam that rinses clean."),
        ],
    },
    {
        "slug": "hibiscus-soap",
        "name": "Hibiscus Soap",
        "tamil_name": "செம்பருத்தி சோப்",
        "category": "soap",
        "shape": "flower",
        "tagline": "Hair and skin, both fed",
        "description": (
            "Hibiscus leaf and flower, ground together with aloe and manjistha in a coconut base. "
            "The natural AHAs soften skin while the mucilage wraps hair roots in slip — the bar our "
            "customers use from head to toe."
        ),
        "base_price": 149,
        "mrp": 199,
        "weight": "100 g",
        "badge": "Hair + skin",
        "color_from": "#7C1F33",
        "color_to": "#E06A7B",
        "accent": "#FFD9DF",
        "base_layer": "coconut",
        "is_featured": True,
        "sort_order": 7,
        "ingredients": [
            _ing("hibiscus", "Hair growth & glow"),
            _ing("alovera_gel", "Softening slip"),
            _ing("manjistha_powder", "Even tone"),
            _ing("essential_oil", "Fresh floral finish"),
        ],
        "benefits": [
            _benefit("Boosts hair growth", "Hibiscus is the classic Tamil remedy for thicker, longer hair."),
            _benefit("Strengthens roots", "Natural mucilage reduces breakage and split ends."),
            _benefit("Skin glow", "AHAs gently resurface dull, flaky patches."),
            _benefit("Natural colour", "Leaves a soft rose tint on the skin after the bath."),
        ],
    },
    {
        "slug": "herbal-bathing-powder",
        "name": "Herbal Bathing Powder",
        "tamil_name": "மூலிகை குளியல்பொடி",
        "category": "powder",
        "tagline": "The full body ubtan, ready in seconds",
        "description": (
            "Eleven herbs, stone milled into a fine bath powder. Mix with water, curd or rose water, "
            "rub in circles and rinse — the traditional Tamil ubtan that lifts tan, cools the body and "
            "leaves skin impossibly smooth. Enough for roughly twenty baths."
        ),
        "base_price": 199,
        "mrp": 259,
        "weight": "150 g",
        "badge": "Ubtan",
        "color_from": "#8A6C38",
        "color_to": "#DCC48A",
        "accent": "#FBF0D2",
        "base_layer": "",
        "is_featured": True,
        "sort_order": 8,
        "ingredients": [
            _ing("fenugreek", "Softens & de-tans"),
            _ing("greengram", "Gentle exfoliation"),
            _ing("hibiscus", "Skin & hair food"),
            _ing("vettiver", "Body cooling"),
            _ing("kasthuri_manjal", "Bridal glow"),
            _ing("kuppaimeni_leaf", "Calms itching"),
            _ing("panner_rose", "Rose hydration"),
            _ing("sandal", "Cooling fragrance"),
            _ing("manjistha_powder", "Evens tone"),
            _ing("neem_powder", "Antibacterial"),
            _ing("multani_mitti", "Lifts oil & tan"),
        ],
        "benefits": [
            _benefit("Full body de-tan", "Removes sun tan from arms, neck and feet in one wash."),
            _benefit("Cools the body", "Vettiver and sandal bring down heat rash and prickly heat."),
            _benefit("Silk smooth skin", "Green gram micro-exfoliates without a single scratch."),
            _benefit("Just herbs, no soap", "Eleven herbs and nothing else — gentle enough for children too."),
        ],
    },
    {
        "slug": "herbal-face-pack",
        "name": "Herbal Face Pack",
        "tamil_name": "மூலிகை முகப்பூச்சு",
        "category": "pack",
        "tagline": "Fifteen minutes to a lit-up face",
        "description": (
            "The same eleven herb blend, milled finer for the face. Mix with rose water or curd, "
            "apply, let it dry for fifteen minutes and rinse. Multani mitti pulls oil, kasthuri manjal "
            "softens blemishes and sandal cools the whole face down."
        ),
        "base_price": 249,
        "mrp": 319,
        "weight": "100 g",
        "badge": "Weekly ritual",
        "color_from": "#9C7442",
        "color_to": "#EBD9B4",
        "accent": "#FFF6E2",
        "base_layer": "",
        "is_featured": True,
        "sort_order": 9,
        "ingredients": [
            _ing("multani_mitti", "Oil control"),
            _ing("kasthuri_manjal", "Blemish softening"),
            _ing("sandal", "Cooling & calming"),
            _ing("manjistha_powder", "Pigmentation care"),
            _ing("neem_powder", "Acne bacteria"),
            _ing("kuppaimeni_leaf", "Soothes irritation"),
            _ing("panner_rose", "Rose hydration"),
            _ing("vettiver", "Pore tightening"),
            _ing("fenugreek", "Skin softening"),
            _ing("greengram", "Gentle polish"),
            _ing("hibiscus", "Natural AHAs"),
        ],
        "benefits": [
            _benefit("Deep cleanse", "Draws out oil and grime from congested pores."),
            _benefit("Oil control", "Multani mitti keeps shine away for a full day."),
            _benefit("Instant glow", "Kasthuri manjal and rose leave skin bright and even."),
            _benefit("Calms acne", "Neem and kuppaimeni reduce redness around active breakouts."),
        ],
    },
    {
        "slug": "hairwash-powder",
        "name": "Hairwash Powder",
        "tamil_name": "தலைக்குளியல் பொடி",
        "category": "powder",
        "tagline": "Five herbs, zero shampoo",
        "description": (
            "Fenugreek, green gram, hibiscus, chikakai and soap nuts — the five herb hair wash our "
            "grandmothers used before shampoo existed. Soak a spoonful, massage into the scalp, rinse. "
            "Hair comes out clean, bouncy and naturally shiny."
        ),
        "base_price": 179,
        "mrp": 239,
        "weight": "150 g",
        "badge": "No shampoo",
        "color_from": "#4E3A22",
        "color_to": "#B79B6A",
        "accent": "#F3E7CF",
        "base_layer": "",
        "is_featured": True,
        "sort_order": 10,
        "ingredients": [
            _ing("fenugreek", "Dandruff control"),
            _ing("greengram", "Mild scalp cleanse"),
            _ing("hibiscus", "Growth & shine"),
            _ing("chikakai", "Natural shampoo"),
            _ing("soap_nuts", "Soft saponin lather"),
        ],
        "benefits": [
            _benefit("Natural shampoo", "Cleanses without sulphates, silicones or fragrance."),
            _benefit("Dandruff control", "Fenugreek and chikakai keep the scalp calm and flake free."),
            _benefit("Stronger roots", "Hibiscus mucilage reduces hair fall over a few weeks."),
            _benefit("Silky shine", "Green gram leaves a soft, non-greasy slip."),
        ],
    },
]


def build_product_payload() -> list[dict]:
    """Return products enriched with the ingredient benefit text."""
    payload = []
    for p in PRODUCTS:
        item = {k: v for k, v in p.items() if k not in ("ingredients", "benefits")}
        item["ingredients"] = [
            {**ing, "benefit": _ING[ing["ingredient_slug"]]["benefit"]} for ing in p["ingredients"]
        ]
        item["benefits"] = p["benefits"]
        payload.append(item)
    return payload


def base_payload() -> list[dict]:
    return [dict(b) for b in BASES]


def ingredient_payload() -> list[dict]:
    return [dict(i) for i in INGREDIENTS]


def find_ingredient(slug: str) -> dict | None:
    return _ING.get(slug)


def find_base(slug: str) -> dict | None:
    return _BASE.get(slug)
