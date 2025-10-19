import { CUSTOM_CHARACTER_CATEGORY_ID, CUSTOM_CHARACTER_CATEGORY_NAME, CUSTOM_CHARACTER_CATEGORY_PATH } from "@/lib/constants/customCharacters";

export { type Category, DEFAULT_CATEGORIES };

interface Category {
    id: number;
    name: string;
    nameKey?: string; // Translation key for i18n
    pid: number | null;
    children?: Category[];
}

const DEFAULT_CATEGORIES = [
    {
        id: CUSTOM_CHARACTER_CATEGORY_ID,
        path: CUSTOM_CHARACTER_CATEGORY_PATH,
        name: CUSTOM_CHARACTER_CATEGORY_NAME,
        nameKey: 'compareheights.categories.custom_characters',
        pid: null
    },
    {
        id: 1,
        path: 'generic',
        name: 'Generic Human',
        nameKey: 'compareheights.categories.generic_human',
        pid: null,
        children: [
            {
                id: 110,
                path: 'generic_people',
                name: 'Generic People',
                nameKey: 'compareheights.categories.generic_people',
                pid: null
            },
            {
                id: 120,
                path: 'people',
                name: 'People',
                nameKey: 'compareheights.categories.people',
                pid: null
            },
            {
                id: 130,
                path: 'old_people',
                name: 'Old People',
                nameKey: 'compareheights.categories.old_people',
                pid: null
            },
            {
                id: 140,
                path: 'baby',
                name: 'Baby',
                nameKey: 'compareheights.categories.baby',
                pid: null
            },
            {
                id: 150,
                path: 'children',
                name: 'Children',
                nameKey: 'compareheights.categories.children',
                pid: null
            },
            {
                id: 160,
                path: 'country_average_height',
                name: 'Country Average Height',
                nameKey: 'compareheights.categories.country_average_height',
                pid: null
            }
        ]
    },
    {
        id: 2,
        path: 'celebrity',
        name: 'Celebrity',
        nameKey: 'compareheights.categories.celebrity',
        pid: null,
        children: [
            {
                id: 210,
                path: 'entertainment_celebs',
                name: 'Entertainment Celebs',
                nameKey: 'compareheights.categories.entertainment_celebs',
                pid: null
            },
            {
                id: 220,
                path: 'sports_stars',
                name: 'Sports Stars',
                nameKey: 'compareheights.categories.sports_stars',
                pid: null
            },
            {
                id: 230,
                path: 'politician',
                name: 'Politician',
                nameKey: 'compareheights.categories.politician',
                pid: null
            },
            {
                id: 240,
                path: 'height_record_holders',
                name: 'Height Record Holders',
                nameKey: 'compareheights.categories.height_record_holders',
                pid: null
            },
            {
                id: 250,
                path: 'religious_mythological',
                name: 'Religious & Mythological',
                nameKey: 'compareheights.categories.religious_mythological',
                pid: null
            }
        ]
    },
    {
        id: 3,
        path: 'anime',
        name: 'Anime',
        nameKey: 'compareheights.categories.anime',
        pid: null,
        children: [
            {
                id: 310,
                path: 'one_piece',
                name: 'One Piece',
                nameKey: 'compareheights.categories.one_piece',
                pid: null
            },
            {
                id: 320,
                path: 'attack_on_titan',
                name: 'Attack on Titan',
                nameKey: 'compareheights.categories.attack_on_titan',
                pid: null
            },
            {
                id: 330,
                path: 'naruto',
                name: 'Naruto',
                nameKey: 'compareheights.categories.naruto',
                pid: null
            },
            {
                id: 340,
                path: 'dragon_ball',
                name: 'Dragon Ball',
                nameKey: 'compareheights.categories.dragon_ball',
                pid: null
            },
            {
                id: 350,
                path: 'demon_slayer',
                name: 'Demon Slayer',
                nameKey: 'compareheights.categories.demon_slayer',
                pid: null
            },
            {
                id: 360,
                path: 'one_punch_man',
                name: 'One Punch Man',
                nameKey: 'compareheights.categories.one_punch_man',
                pid: null
            },
            {
                id: 399,
                path: 'other_anime',
                name: 'Other Anime',
                nameKey: 'compareheights.categories.other_anime',
                pid: null
            }

        ]
    },
    {
        id: 10,
        path: 'films',
        name: 'Films',
        nameKey: 'compareheights.categories.films',
        pid: null,
        children: [
            {
                id: 1010,
                path: 'star_wars',
                name: 'Star Wars',
                nameKey: 'compareheights.categories.star_wars',
                pid: null
            },
            {
                id: 1020,
                path: 'walking_dead',
                name: 'Walking Dead',
                nameKey: 'compareheights.categories.walking_dead',
                pid: null
            }
        ]
    },
    {
        id: 4,
        path: 'fictional_characters',
        name: 'Fictional Characters',
        nameKey: 'compareheights.categories.fictional_characters',
        pid: null
    },
    {
        id: 5,
        path: 'game',
        name: 'Game',
        nameKey: 'compareheights.categories.game',
        pid: null,
        children: [
            {
                id: 510,
                path: 'dungeons_dragons',
                name: 'Dungeons & Dragons',
                nameKey: 'compareheights.categories.dungeons_dragons',
                pid: null
            }
        ]
    },
    {
        id: 6,
        path: 'animals',
        name: 'Animals',
        nameKey: 'compareheights.categories.animals',
        pid: null,
        children: [
            {
                id: 610,
                path: 'dogs',
                name: 'Dogs',
                nameKey: 'compareheights.categories.dogs',
                pid: null
            },
            {
                id: 620,
                path: 'cats',
                name: 'Cats',
                nameKey: 'compareheights.categories.cats',
                pid: null
            }
        ]
    },
    {
        id: 7,
        path: 'plants',
        name: 'Plants',
        nameKey: 'compareheights.categories.plants',
        pid: null
    },
    {
        id: 8,
        path: 'microorganisms',
        name: 'Microorganisms',
        nameKey: 'compareheights.categories.microorganisms',
        pid: null
    },
    {
        id: 9,
        path: 'objects',
        name: 'Objects',
        nameKey: 'compareheights.categories.objects',
        pid: null,
        children: [
            {
                id: 910,
                path: 'astronomy',
                name: 'Astronomy',
                nameKey: 'compareheights.categories.astronomy',
                pid: null
            },
            {
                id: 920,
                path: 'buildings',
                name: 'Buildings',
                nameKey: 'compareheights.categories.buildings',
                pid: null
            }
        ]
    }
];


