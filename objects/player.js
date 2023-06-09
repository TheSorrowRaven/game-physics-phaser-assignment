/********************************************
Course : TGD2251 Game Physics
Session: Trimester 2, 2022/23
ID and Name #1 : 1191101213 RavenLimZheXuan
Contacts #1 : 011-55873318 1191101213@student.mmu.edu.my
********************************************/

class Player extends Phaser.Physics.Arcade.Sprite {

    constructor(game, x, y, cat) {
        super(game, x, y, "cat");
        game.add.existing(this);
        game.physics.add.existing(this);

        this.tint = cat.color;
        this.cat = cat;


        this.init(game);
        this.start(game, cat);
    }

    init(game) {

        // Don't lose these variables
        this.foodHolding = 0;


        this.on('animationcomplete', (animation, frame, sprite) => {
            if (animation.key == 'idle') {
                this.anims.play('idle_sit', true);
                this.anim = 'idle_sit';
            }
        }, this);

        game.physics.add.collider(this, game.platforms, () => {

        });
        game.physics.add.collider(this, game.spikesGroup, (_, spike) => {
            this.hitBySpike(game, spike);
        });


        game.physics.add.overlap(this, game.foodGroup, (_, food) => {
            if (food.looted) {
                return;
            }
            this.foodInRange = food;
        })
        game.physics.add.overlap(this, game.foodStorage, () => {
            this.transferFood(game);
        });
        game.physics.add.overlap(this, game.sleepingCats, (_, cat) => {
            this.catInRange = cat;
        })

    }


    start(game, cat) {
        this.tint = cat.color;

        this.setScale(g.pixelScale);
        this.anims.play('walk', true);
        this.anim = 'walk';

        // Cat variables
        this.lives = cat.lives;

        // Movement
        this.xAcceleration = 40;
        this.xDeceleration = 50;
        this.jumpVelocity = 600;
        this.wallJumpVelocityY = 600;
        this.wallJumpVelocityX = 600;
        this.maxXSpeed = 400;
        this.maxFallSpeed = 750;
        this.grabFallDeceleration = 15;
        this.grabFallMaxSpeed = 200;

        this.maxWallJumps = 1000;
        this.maxSkyJumps = 0; //double jumps

        this.maxStamina = 100;
        this.staminaDrain = 10; //per second
        this.staminaRegeneration = 10; // per second
        this.stamina = this.maxStamina;

        //invulnerability
        this.hitInvulTime = 2; // seconds
        this.hitInvulTimeCount = 0;
        this.hitInvulBlink = 0.2 // 

        this.deadRespawnTime = 4;
        this.deadRespawnTimeCount = 0;

        this.dead = false;

        this.body.setSize(12, 12);
        this.body.setOffset(10, 20);

        this.isGrounded = false;

        this.setCollideWorldBounds(true);
    }


    hitBySpike(game, spike) {
        if (this.hitInvulTimeCount > 0) {
            return;
        }
        this.hitInvulTimeCount = this.hitInvulTime;

        let angle = getAngle(this, spike);
        let value = game.physics.velocityFromAngle(angle, 1000, this.body.velocity);
        this.setVelocityX(-value.x);
        this.setVelocityY(-value.y);

        this.lose_life(game);
    }

    increaseFood(data, amount) {
        const ui = data.ui;
        this.foodHolding += amount;
        ui.setFoodHolding(this.foodHolding);
    }
    decreaseFood(ui, amount) {
        this.foodHolding -= amount;
        ui.setFoodHolding(this.foodHolding);
    }

    transferFood(game) {
        if (this.foodHolding > 0) {
            game.increaseFood(1);
            this.decreaseFood(game.ui, 1);
            game.deposit.play();
        }
    }

    update(data) {

        const game = data.game;

        this.update_contacts(data);
        this.update_input(data);

        this.update_hMovement(data);
        this.update_vMovement(data);

        this.update_stamina(data);


        //
        this.update_interact(data);
        this.update_lives(data);

        this.update_dead(data);



    }

    update_dead(data) {
        const game = data.game;
        if (!this.dead) {
            return;
        }
        const deltaTime = data.deltaTime;
        this.deadRespawnTimeCount -= deltaTime;
        if (this.deadRespawnTimeCount < 0) {
            let nextCat = game.getNextAliveCat();
            if (nextCat === undefined) {
                return;
            }
            this.x = nextCat.sleepingCat.x;
            this.y = nextCat.sleepingCat.y;
            this.cat = nextCat;
            nextCat.sleepingCat.destroy();
            this.start(game, nextCat);
            game.cat_start.play();
        }
    }

    update_lives(data) {
        data.ui.setLives(this.lives);
        if (this.dead) {
            return;
        }

        if (this.hitInvulTimeCount > 0) {
            const deltaTime = data.deltaTime;
            this.hitInvulTimeCount -= deltaTime;

            let blink = Math.round(this.hitInvulTimeCount / this.hitInvulBlink);
            let doBlink = blink % 2 == 0;
            if (doBlink) {
                this.alpha = 0.2;
            }
            else {
                this.alpha = 1;
            }

        }
        else {
            this.alpha = 1;
        }
    }

    update_interact(data) {
        if (this.dead) {
            return;
        }
        const game = data.game;
        const ui = data.ui;
        if (this.catInRange) {
            ui.setInteract(this.catInRange);

            if (game.cursors.f.firstDown) {
                this.catInRange.tint = this.cat.color;
                this.switch_cat(game, this.x, this.y, this.catInRange);
            }

            this.catInRange = undefined;
            return;
        }
        if (this.foodInRange) {
            ui.setInteract(this.foodInRange);

            if (game.cursors.f.isDown) {
                this.foodInRange.looted = true;
                this.increaseFood(data, this.foodInRange.amount);
                this.foodInRange.particles.destroy();
                this.foodInRange.destroy();
                game.gain.play();
            }

            this.foodInRange = undefined;
            return;
        }
        ui.setInteract();
    }

    switch_cat(game, x, y, catInRange) {
        game.switchCat(this.cat, catInRange.cat);
        this.x = x;
        this.y = y;
        this.tint = catInRange.cat.color;
        let cat = this.cat;
        this.cat = catInRange.cat;
        catInRange.cat = cat;

        this.start(game, this.cat);
        game.cat_start.play();
    }

    lose_life(game) {
        if (this.lives == 0) {
            console.error("Player already ded");
            return;
        }
        this.lives--;
        if (this.lives <= 0) {
            this.cat_died(game);
            game.cat_die.play();
            return;
        }
        else {
            game.cat_hurt.play();
        }
    }

    cat_died(game) {
        this.cat.amount = this.foodHolding;

        game.spawn_deadCat(this.cat, { x: this.x, y: this.y });
        this.body.setAllowGravity(false);
        this.body.stop();
        this.body.setVelocityX(0);
        this.body.setVelocityY(0);

        this.deadRespawnTimeCount = this.deadRespawnTime;

        this.dead = true;
        this.cat.dead = true;
        this.alpha = 0;
    }

    update_contacts(data) {
        if (this.dead) {
            return;
        }

        if (this.body.blocked.left) {
            if (!this.canGrabWall) {
                this.canGrabWall = true;
                this.canWallJump = true;
                this.wallDirectionIsLeft = true;
            }
        }
        else if (this.body.blocked.right) {
            if (!this.canGrabWall) {
                this.canWallJump = true;
                this.canGrabWall = true;
                this.wallDirectionIsLeft = false;
            }
        }
        else {
            this.canGrabWall = false;
            this.canWallJump = false;
        }

        this.isGrounded = this.body.onFloor();
        if (this.isGrounded) {
            this.wallJumps = this.maxWallJumps;
            this.skyJumps = this.maxSkyJumps;
        }
    }

    update_input(data) {
        if (this.dead) {
            return;
        }

        const game = data.game;

        let input = { x: 0, y: 0 };
        let vMovement, hMovement = false;
        if (game.cursors.right.isDown) {
            input.x += 1;
            hMovement = true;
            this.setFlipX(false)

            if (game.cursors.right.wasUp) {
                game.cursors.right.firstDown = true;
                game.cursors.right.wasUp = false;
            }
            else {
                game.cursors.right.firstDown = false;
            }
        }
        else {
            game.cursors.right.wasUp = true;
            game.cursors.right.firstDown = false;
        }
        if (game.cursors.left.isDown) {
            input.x -= 1;
            hMovement = hMovement ? false : true; // Cancel out horizontal movement
            this.setFlipX(true)

            if (game.cursors.left.wasUp) {
                game.cursors.left.firstDown = true;
                game.cursors.left.wasUp = false;
            }
            else {
                game.cursors.left.firstDown = false;
            }
        }
        else {
            game.cursors.left.wasUp = true;
            game.cursors.left.firstDown = false;
        }
        if (game.cursors.up.isDown) {
            input.y -= 1;
            vMovement = true;

            if (game.cursors.up.wasUp) {
                game.cursors.up.firstDown = true;
                game.cursors.up.wasUp = false;
            }
            else {
                game.cursors.up.firstDown = false;
            }
        }
        else {
            game.cursors.up.wasUp = true;
            game.cursors.up.firstDown = false;
        }
        if (game.cursors.down.isDown) {
            //input.y += 1;
            //verticalMovement = true;
        }


        if (game.cursors.f.isDown) {
            if (game.cursors.f.wasUp) {
                game.cursors.f.firstDown = true;
                game.cursors.f.wasUp = false;
            }
            else {
                game.cursors.f.firstDown = false;
            }
        }
        else {
            game.cursors.f.wasUp = true;
            game.cursors.f.firstDown = false;
        }

        this.isGrabbingWall = this.canGrabWall && game.cursors.shift.isDown;
        this.isSlidingDownWall = this.canGrabWall && !this.isGrabbingWall;

        data.input = input;
        data.hMovement = hMovement;
        data.vMovement = vMovement;
    }

    update_stamina(data) {
        if (this.dead) {
            return;
        }

        const deltaTime = data.deltaTime;
        if (this.usingStamina) {
            this.usingStamina = false;
        }
        else if (this.isGrounded) {
            if (this.stamina < this.maxStamina) {
                this.stamina += this.staminaRegeneration * deltaTime;
            }
        }
        this.update_staminaUI(data);
    }

    update_staminaUI(data) {
        const ui = data.ui;
        ui.setStamina(this.stamina / this.maxStamina);
    }

    update_hMovement(data) {
        if (this.dead) {
            return;
        }

        const x = data.input.x;
        const hMovement = data.hMovement;
        const deltaOne = data.deltaOne;

        if (hMovement) {
            let xVel = this.body.velocity.x + x * this.xAcceleration * deltaOne;
            let isMaxSpeed = false;
            if (xVel > this.maxXSpeed) {
                xVel = this.maxXSpeed;
                isMaxSpeed = true;
            }
            else if (xVel < -this.maxXSpeed) {
                xVel = -this.maxXSpeed;
                isMaxSpeed = true;
            }
            this.setVelocityX(xVel);
            this.anims.play('run', true);
            this.anim = 'run';
        }
        else {
            let xVel = this.body.velocity.x;
            let isStopped = false;
            if (xVel > 0) {
                xVel -= this.xDeceleration * deltaOne;
                if (xVel < 0) {
                    xVel = 0;
                }
            }
            else if (xVel < 0) {
                xVel += this.xDeceleration * deltaOne;
                if (xVel > 0) {
                    xVel = 0;
                }
            }
            else {
                isStopped = true;
            }
            this.setVelocityX(xVel);
            if (isStopped) {
                if (this.anim != 'idle_sit') {
                    this.anims.play('idle', true);
                    this.anim = 'idle';
                }
            }
            else {
                this.anims.play('run', true);
                this.anim = 'run';
            }
        }
    }

    update_vMovement(data) {
        if (this.dead) {
            return;
        }

        const game = data.game;

        const jumpFirstDown = game.cursors.up.firstDown;
        data.jumpFirstDown = jumpFirstDown;

        const y = data.input.y;
        const vMovement = data.vMovement;

        this.stickingOnWall = false;

        if (this.isGrounded) {
            // On floor
            if (vMovement && jumpFirstDown) {
                let jumpVel = y * this.jumpVelocity;
                this.jump('ground', jumpVel);
                game.cat_jump.play();

                this.isGrounded = false;
            }
        }
        else if (this.isGrabbingWall) {
            // Grabbing on wall
            if (this.tryWallJump(data)) {
                game.cat_wallJump.play();
            }
            else {
                // stamina check
                if (this.grabbing_consumeStamina(data)) {
                    this.stickOnWall();
                }
                else {
                    this.slideDownWall();
                }
            }
        }
        else if (this.isSlidingDownWall) {
            // Not grabbing, but running towards the wall
            if (this.tryWallJump(data)) {
                game.cat_wallJump.play();
            }
            else {
                this.slideDownWall();
            }
        }
        else {
            // Sky - falling/jumping
            if (vMovement && jumpFirstDown && this.skyJumps > 0) {
                let jumpVel = y * this.jumpVelocity;
                this.jump('sky', jumpVel)
            }
        }

        this.body.setAllowGravity(!this.stickingOnWall);

        // Limit max falling speed to prevent player from glitching through Arcade's physics
        if (this.body.velocity.y > this.maxFallSpeed) {
            this.setVelocityY(this.maxFallSpeed);
        }

    }

    grabbing_consumeStamina(data) {
        const deltaTime = data.deltaTime;

        if (this.stamina > 0) {
            this.stamina -= this.staminaDrain * deltaTime;
            this.usingStamina = true;
            return true;
        }
        return false;
    }

    stickOnWall() {
        if (this.body.velocity.y >= 0) {
            this.setVelocityY(0);
            this.stickingOnWall = true;
        }
    }

    slideDownWall() {
        if (this.body.velocity.y > 0) {
            let velY = this.body.velocity.y - this.grabFallDeceleration;
            if (velY > this.grabFallMaxSpeed) {
                velY = this.grabFallMaxSpeed;
            }
            this.setVelocityY(velY);
        }
    }

    tryWallJump(data) {

        const vMovement = data.vMovement;
        const y = data.input.y;
        const jumpFirstDown = data.jumpFirstDown;

        if (vMovement && jumpFirstDown && this.canWallJump && this.wallJumps > 0) {
            let jumpVelX = this.wallJumpVelocityX;
            let jumpVelY = y * this.wallJumpVelocityY;

            this.jump('wall', jumpVelY, this.wallDirectionIsLeft ? jumpVelX : -jumpVelX);

            this.canWallJump = false;
            return true;
        }
        return false;
    }

    jump(type, velY, velX) {
        if (type === 'ground') {
            this.setVelocityY(velY);
        }
        else if (type === 'sky') {
            this.setVelocityY(velY);
            this.skyJumps--;
        }
        else if (type === 'wall') {
            this.setVelocityY(velY);
            this.setVelocityX(velX);
            this.wallJumps--;
        }
    }

}