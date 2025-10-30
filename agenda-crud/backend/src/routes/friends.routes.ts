import { Router } from 'express';
import * as ctrl from '../controllers/friends.controller';

const router = Router();

router.get('/', ctrl.listFriends);
router.get('/:id', ctrl.getFriend);
router.post('/', ctrl.createFriend);
router.put('/:id', ctrl.updateFriend);
router.delete('/:id', ctrl.deleteFriend);

export default router;
