from flask import Flask, render_template, session, g, redirect, url_for
import json
import random

app = Flask(__name__)
app.secret_key = "localtestyaaaay"

@app.route("/")
def index():
    if session.get('game_state', False) == False:
        start_game(difficulty="easy")
    return render_template("index.html", header=header_data(), player_cards=player_cards(), pict_cards=pict_cards())

@app.route("/nextround")
def nextround():
    # Reset Pict Attack on new round
    round_pict_attack = {
            "left": 0,
            "middle": 0,
            "right": 0
        }
    session['game_state']['round_pict_attack'] = round_pict_attack

    session['game_state']['round_market_pict_cards'] = 0 # Extra pict cards from using the Enemy market - reset per round


    pict_cards_deck = pict_cards()
    # Grab the current location in the random card array
    pict_card_array_location = session['game_state']['pict_card_location']
    next_pict_card = session['game_state']['pict_card_order'][pict_card_array_location]
    session['game_state']['pict_card_location'] += 1
    # And pull the card from the known-state deck
    resources_card = pict_cards_deck[next_pict_card]


    # Iterate for resources
    round_resources = {
        "soldier": 0,
        "builder": 0,
        "servant": 0,
        "civilian": 0,
        "stone": 0,
    }

    for _resource in resources_card['resources']:
        round_resources[_resource] = resources_card['resources'][_resource]

    # Ongoing resources here - only 3 so hard-coding
    for _resource in ['stone', 'builder', 'civilian']:
        round_resources[_resource] += session['game_state']['ongoing_resources'][_resource]

    session['game_state']['round_resources'] = round_resources
    # Increment round
    session['game_state']['round'] += 1
    session['game_state']['state'] = "player_cards"


    session.modified = True
    return redirect(url_for('index'))


@app.route("/pickplayercard/<card>")
def pickplayercard(card):
    # card is either 1 or 2

    offset_selected = 0
    offset_not_selected = 1
    
    # Or...
    if card == "2":
        offset_selected = 1
        offset_not_selected = 0

    player_cards_deck = player_cards()
    player_card_location = session['game_state']['player_card_location']
    player_card_selected = session['game_state']['player_card_order'][player_card_location + offset_selected] # Card is 1/2, so a -1 offset gets us where we need to go.

    player_card_not_selected = session['game_state']['player_card_order'][player_card_location + offset_not_selected] # Card is 1/2, so a -1 offset gets us where we need to go.
    session['game_state']['player_card_not_selected'] = player_card_not_selected

    session['game_state']['player_cards_selected'].append(player_card_selected)

    session['game_state']['state'] = "pict_attack"
    session['game_state']['player_card_location'] += 2 # Drew 2 cards, increment the counter

    # Add resources and display the one we didn't select for market and shape
    for _resource in player_cards_deck[player_card_not_selected]['resources']:
        print(_resource)
        session['game_state']['round_resources'][_resource] += 1

    session.modified = True
    return redirect(url_for('index'))

# Using the enemy market card
@app.route("/enemymarket")
def enemymarket():
    session['game_state']['round_market_pict_cards'] += 1 # Extra pict cards from using the Enemy market or scouting shape

    session.modified = True
    return redirect(url_for('index'))



@app.route("/pictattack")
def pictattack():
    # Draw the number of cards per round, aggregate their attack, and display it
    # TODO Also include the round bonus picts

    rounds_data = header_data()
    round_data = rounds_data[session['game_state']['round'] - 1 ] # Offset

    picts_to_draw = round_data[session['game_state']['difficulty']]
    picts_to_draw += session['game_state']['round_market_pict_cards']

    round_pict_attack = {
        "left": 0,
        "middle": 0,
        "right": 0
    }

    # Pict known state deck
    pict_cards_deck = pict_cards()

    pict_card_start_location = session['game_state']['pict_card_location']
    for i in range(picts_to_draw):
        next_pict_card = session['game_state']['pict_card_order'][pict_card_start_location + i]
        # And pull the card from the known-state deck
        pict_card = pict_cards_deck[next_pict_card]
        round_pict_attack[pict_card['attack']] += 1

    # Update the card location
    session['game_state']['pict_card_location'] += picts_to_draw

    session['game_state']['round_pict_attack'] = round_pict_attack

    session['game_state']['state'] = "next_round"

    session.modified = True
    return redirect(url_for('index'))

@app.route("/ongoing/<resource>/<operator>")
def modify_ongoing_resources(resource=None,operator=None):
    if resource in session['game_state']['ongoing_resources']:
        if operator == "increment":
            session['game_state']['ongoing_resources'][resource] += 1
        if operator == "decrement":
            session['game_state']['ongoing_resources'][resource] -= 1
        
        session.modified = True

    return redirect(url_for('index'))


@app.route("/newgame/<difficulty>")
def new_game(difficulty="easy"):
    session.clear()
    start_game(difficulty)
    return redirect(url_for('index'))

@app.route("/debug")
def debug():
    session['game_state']['debug'] = True
    session.modified = True
    return redirect(url_for('index'))

def start_game(difficulty):
    # Load cards data
    player_cards()

    # Define the initial game state here
    game_state = {
        "id": "asdf", # UUID to store and retrieve session from the DB (Using session cookies for now) 
        "difficulty": difficulty,
        "round": 0,
        "state": "start",
        # Round resources that are gained per round from board events
        "ongoing_resources": {
            "stone": 1,
            "builder": 0,
            "civilian": 0,
            # These are just here as reminders in the Web UI - No other functionality currently
            "renown": 0,
            "piety": 0,
            "valour": 0,
            "discipline": 0
        },
        # Resources acquired this round, resets every new round
        "round_resources": {
            "soldier": 0,
            "builder": 0,
            "servant": 0,
            "civilian": 0,
            "stone": 0
        },
        "player_card_order": player_cards_random_order(), #List of card numbers that are randomly drawn
        "player_card_location": 0, # Location in the player_card_order list
        "player_cards_selected": [],
        "player_card_not_selected": False, # Round based card showing which wasn't selected
        "enemy_player_card_order": player_cards_random_order(), #List of card numbers that are randomly drawn for the enemy - First 6 are used
        "enemy_player_card_location": 0, # Location in the player_card_order list
        "pict_card_order": pict_cards_random_order(), # List of random Pict cards
        "pict_card_location": 0, # Location in the pict_card_order list
        "round_pict_attack": {
            "left": 0,
            "middle": 0,
            "right": 0
        },
        "round_market_pict_cards": 0, # Extra pict cards per round by using the market
        "debug": False
    }
    session['game_state'] = game_state
    return

def player_cards():
    if g.get('player_cards', None) is None:
        with open('data/player-cards.json', 'r') as f:
            data = json.load(f)
            g.player_cards = data
    return g.player_cards

def pict_cards():
    if g.get('pict_cards', None) is None:
        with open('data/pict-cards.json', 'r') as f:
            data = json.load(f)
            g.pict_cards = data
    return g.pict_cards

def player_cards_random_order():
    cards = player_cards()
    random_array = []
    for i in range(len(cards)):
        random_array.append(i)
    random.shuffle(random_array)
    return random_array

def pict_cards_random_order():
    cards = pict_cards()
    random_array = []
    for i in range(len(cards)):
        random_array.append(i)
    random.shuffle(random_array)
    return random_array

def header_data():
    header = [
        {"round": 1, "vp":1, "easy":1, "medium":1, "hard":1},
        {"round": 2, "vp":2, "easy":2, "medium":2, "hard":3},
        {"round": 3, "vp":2, "easy":3, "medium":4, "hard":5},
        {"round": 4, "vp":3, "easy":4, "medium":6, "hard":7},
        {"round": 5, "vp":3, "easy":6, "medium":8, "hard":9},
        {"round": 6, "vp":4, "easy":8, "medium":10, "hard":12},
    ]
    return header