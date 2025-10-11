import { CUSTOM_CHARACTER_CATEGORY_ID, CUSTOM_CHARACTER_CATEGORY_NAME, CUSTOM_CHARACTER_CATEGORY_PATH } from "@/lib/constants/customCharacters";

export { type Category, DEFAULT_CATEGORIES };

interface Category {
    id: number;
    name: string;
    pid: number | null;
    children?: Category[];
}

const DEFAULT_CATEGORIES = [
    {
        id: CUSTOM_CHARACTER_CATEGORY_ID,
        path: CUSTOM_CHARACTER_CATEGORY_PATH,
        name: CUSTOM_CHARACTER_CATEGORY_NAME,
        pid: null
    },
    {
        id: 1,
        path: 'generic',
        name: 'Generic Human',
        pid: null,
        children: [
            {
                id: 110,
                path: 'generic_people',
                name: 'Generic People',
                pid: null
            },
            {
                id: 120,
                path: 'people',
                name: 'People',
                pid: null
            },
            {
                id: 130,
                path: 'old_people',
                name: 'Old People',
                pid: null
            },
            {
                id: 140,
                path: 'baby',
                name: 'Baby',
                pid: null
            },
            {
                id: 150,
                path: 'children',
                name: 'Children',
                pid: null
            },
            {
                id: 160,
                path: 'country_average_height',
                name: 'Country Average Height',
                pid: null
            }
        ]
    },
    {
        id: 2,
        path: 'celebrity',
        name: 'Celebrity',
        pid: null,
        children: [
            {
                id: 210,
                path: 'entertainment_celebs',
                name: 'Entertainment Celebs',
                pid: null
            },
            {
                id: 220,
                path: 'sports_stars',
                name: 'Sports Stars',
                pid: null
            },
            {
                id: 230,
                path: 'politician',
                name: 'Politician',
                pid: null
            },
            {
                id: 240,
                path: 'height_record_holders',
                name: 'Height Record Holders',
                pid: null
            },
            {
                id: 250,
                path: 'religious_mythological',
                name: 'Religious & Mythological',
                pid: null
            }
        ]
    },
    {
        id: 3,
        path: 'anime',
        name: 'Anime',
        pid: null,
        children: [
            {
                id: 310,
                path: 'one_piece',
                name: 'One Piece',
                pid: null
            },
            {
                id: 320,
                path: 'attack_on_titan',
                name: 'Attack on Titan',
                pid: null
            },
            {
                id: 330,
                path: 'naruto',
                name: 'Naruto',
                pid: null
            },
            {
                id: 340,
                path: 'dragon_ball',
                name: 'Dragon Ball',
                pid: null
            },
            {
                id: 350,
                path: 'demon_slayer',
                name: 'Demon Slayer',
                pid: null
            },
            {
                id: 360,
                path: 'one_punch_man',
                name: 'One Punch Man',
                pid: null
            },
            {
                id: 399,
                path: 'other_anime',
                name: 'Other Anime',
                pid: null
            }

        ]
    },
    {
        id: 10,
        path: 'films',
        name: 'Films',
        pid: null,
        children: [
            {
                id: 1010,
                path: 'star_wars',
                name: 'Star Wars',
                pid: null
            },
            {
                id: 1020,
                path: 'walking_dead',
                name: 'Walking Dead',
                pid: null
            }
        ]
    },
    {
        id: 4,
        path: 'fictional_characters',
        name: 'Fictional Characters',
        pid: null
    },
    {
        id: 5,
        path: 'game',
        name: 'Game',
        pid: null,
        children: [
            {
                id: 510,
                path: 'dungeons_dragons',
                name: 'Dungeons & Dragons',
                pid: null
            }
        ]
    },
    {
        id: 6,
        path: 'animals',
        name: 'Animals',
        pid: null,
        children: [
            {
                id: 610,
                path: 'dogs',
                name: 'Dogs',
                pid: null
            },
            {
                id: 620,
                path: 'cats',
                name: 'Cats',
                pid: null
            }
        ]
    },
    {
        id: 7,
        path: 'plants',
        name: 'Plants',
        pid: null
    },
    {
        id: 8,
        path: 'microorganisms',
        name: 'Microorganisms',
        pid: null
    },
    {
        id: 9,
        path: 'objects',
        name: 'Objects',
        pid: null,
        children: [
            {
                id: 910,
                path: 'astronomy',
                name: 'Astronomy',
                pid: null
            },
            {
                id: 920,
                path: 'buildings',
                name: 'Buildings',
                pid: null
            }
        ]
    }
];


